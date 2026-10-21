import { Readable } from "stream";
import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  ApiVolunteerApplicationEmailPost,
  ApplicationEmailFailureReason,
  CommunicationType,
  DocumentType,
  UserRole,
} from "need4deed-sdk";
import { Raw } from "typeorm";
import {
  BadRequestError,
  cgcApplicationResendGuardMs,
  ConflictError,
  EmailNotSentError,
  UnauthorizedError,
} from "../../../config";
import Communication from "../../../data/entity/communication.entity";
import Document from "../../../data/entity/document.entity";
import logger from "../../../logger";
import {
  AttachmentUnavailableError,
  EmailSendError,
  SuspendedEmailError,
} from "../../../services/notify";
import { errorName, errorSummary, tryCatch } from "../../../services/utils";
import {
  idParamSchema,
  idTypeParamSchema,
  responseErrors,
  volunteerDocSchemaApplicationEmail201,
  volunteerDocSchemaApplicationEmail502,
  volunteerDocSchemaGet200,
  volunteerDocSchemaGetMeta200,
  volunteerDocSchemaUploadMeta,
} from "../../schema";
import {
  getVolunteerDocuments,
  isStaffRole,
  runWithAdvisoryLock,
} from "../../utils";
import { logEmailCommunication } from "../../utils/data/log-email-communication";

const CGC_APPLICATION_LOCK_NAMESPACE = "cgc-application-email";

function applicationEmailNotSent(err: unknown): EmailNotSentError {
  const notSent = (message: string, reason: ApplicationEmailFailureReason) =>
    new EmailNotSentError(`Application email not sent: ${message}`, {
      reason,
    });
  if (err instanceof AttachmentUnavailableError) {
    return notSent("application form unavailable", "attachment-unavailable");
  }
  if (err instanceof SuspendedEmailError) {
    return notSent(err.problems.join("; "), "email-invalid");
  }
  if (err instanceof EmailSendError) {
    return notSent("mail server did not accept it", "send-failed");
  }
  return notSent("email could not be built", "render-failed");
}

export default async function volunteerDocRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  async function removeUnsentLog(comm: Communication): Promise<void> {
    try {
      await fastify.db.communicationRepository.remove(comm);
    } catch (removeErr) {
      logger.error(
        `unsent application email still logged (communication ${comm.id}): ${errorName(removeErr)}`,
      );
      fastify.notify
        .opsAlert(
          `Application email to volunteer ${comm.volunteerId} was not sent, but communication ${comm.id} could not be removed — delete it by hand.`,
        )
        .catch((err) => logger.error(err));
    }
  }

  fastify.get<{ Params: { id: number } }>(
    "/",
    {
      schema: {
        params: idParamSchema,
        response: {
          200: volunteerDocSchemaGet200,
          ...responseErrors,
        },
      },
    },
    async (request, reply) => {
      const id = request.params.id;
      const role = request.authUser?.role;
      if (!isStaffRole(role)) {
        if (role !== UserRole.VOLUNTEER) {
          throw new UnauthorizedError();
        }
        const volunteer = await fastify.db.volunteerRepository.findOneBy({
          id,
        });
        const isSelf =
          request.authUser?.personId !== undefined &&
          request.authUser?.personId !== null &&
          volunteer?.personId === request.authUser.personId;
        if (!isSelf) {
          throw new UnauthorizedError();
        }
      }

      const documents = await getVolunteerDocuments(id);

      return reply.send({
        message: `Documents for volunteer ${id}`,
        data: documents,
      });
    },
  );

  fastify.post<{ Params: { id: number } }>(
    "/application-email",
    {
      onRequest: fastify.authenticate({ role: UserRole.COORDINATOR }),
      schema: {
        params: idParamSchema,
        response: {
          201: volunteerDocSchemaApplicationEmail201,
          ...responseErrors,
          502: volunteerDocSchemaApplicationEmail502,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const coordinatorPersonId = request.authUser?.personId;
      const [volunteer, coordinator] = await Promise.all([
        fastify.db.volunteerRepository.findOneOrFail({
          where: { id },
          relations: ["person", "person.users"],
        }),
        coordinatorPersonId
          ? fastify.db.personRepository.findOneBy({ id: coordinatorPersonId })
          : null,
      ]);
      const volunteerEmail = volunteer.person?.email;
      if (!volunteerEmail) {
        throw new BadRequestError(`Volunteer ${id} has no email address`);
      }
      const latestUser = [...(volunteer.person.users ?? [])].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      )[0];

      let comm: Communication | undefined;
      const acquired = await runWithAdvisoryLock(
        async (manager) => {
          const commRepo = manager.getRepository(Communication);
          const justSent = await commRepo.existsBy({
            volunteerId: id,
            communicationType: CommunicationType.CGC_APPLICATION_EMAIL,
            date: Raw(
              (alias) =>
                `${alias} > LOCALTIMESTAMP - make_interval(secs => :secs)`,
              { secs: cgcApplicationResendGuardMs / 1000 },
            ),
          });
          if (justSent) {
            throw new ConflictError(
              `Application email to volunteer ${id} is being sent or was just sent`,
            );
          }
          comm = await logEmailCommunication(
            commRepo,
            CommunicationType.CGC_APPLICATION_EMAIL,
            { volunteerId: id, userId: request.authUser?.id },
          );
        },
        [CGC_APPLICATION_LOCK_NAMESPACE, id],
      );
      if (!acquired || !comm) {
        throw new ConflictError(
          `Application email to volunteer ${id} is already being sent`,
        );
      }

      try {
        await fastify.notify.emailCgcApplication({
          volunteerEmail,
          volunteerName: volunteer.person.name,
          language: latestUser?.language,
          coordinatorName: coordinator?.name,
          coordinatorEmail: request.authUser?.email,
        });
      } catch (sendErr) {
        logger.error(
          `application email to volunteer ${id} not sent: ${errorSummary(sendErr)}`,
        );
        await removeUnsentLog(comm);
        throw applicationEmailNotSent(sendErr);
      }

      const data: ApiVolunteerApplicationEmailPost = { sentAt: comm.date };
      return reply.status(201).send({
        message: `Application email sent to volunteer ${id}`,
        data,
      });
    },
  );

  fastify.get(
    "/download",
    { onRequest: fastify.authenticate({ role: UserRole.COORDINATOR }) },
    async (request, reply) => {
      const { url } = request.query as { url: string };
      const fileName = "test_pdf.pdf";

      const [urlObj, error] = await tryCatch(fetch(url));

      if (error) {
        logger.error(`Error fetching document from URL ${url}: ${error}`);
        return reply.status(400).send({
          message: `Error fetching document from URL: ${error}`,
        });
      }

      reply.raw.writeHead(200, {
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Type": "application/pdf",
        "Content-Length": urlObj.headers.get("Content-Length") || "",
      });

      Readable.fromWeb(urlObj.body).pipe(reply.raw);
    },
  );

  fastify.get<{
    Params: { id: number };
    Querystring: { mimeType: string; originalName: string; type: DocumentType };
  }>(
    "/upload-meta",
    {
      onRequest: fastify.authenticate({ role: UserRole.COORDINATOR }),
      schema: {
        params: idParamSchema,
        querystring: volunteerDocSchemaUploadMeta,
        response: { 200: volunteerDocSchemaGetMeta200, ...responseErrors },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { mimeType, originalName, type } = request.query;
      const bucket = process.env.AWS_S3_BUCKET_NAME || "need4deed-images";
      const [, ext] = mimeType?.split("/") || ["", "pdf"];
      const key = `dev/${id}/document-${Date.now()}.${ext}`;

      const customMetadata = {
        "x-amz-meta-volunteer-id": String(id),
        "x-amz-meta-document-type": type,
        "x-amz-meta-original-name": originalName,
        "x-amz-meta-mime-type": mimeType,
        "x-amz-meta-s3-key": key,
      };

      return reply.status(200).send({
        url: `${process.env.MOCK_VOLUNTEER_DOC_S3_UPLOAD_URL}/volunteer/${id}/doc/s3-upload-mock`,
        fields: {
          bucket,
          key,
          Policy: "FAKE_POLICY",
          "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
          "X-Amz-Credential": "FAKE_CREDENTIAL",
          "X-Amz-Date": "20260105T224956Z",
          "X-Amz-Signature": "FAKE_SIGNATURE",
          ...customMetadata,
        },
      });
    },
  );

  fastify.post<{
    Params: {
      id: number;
      Body: {};
    };
  }>(
    "/s3-upload-mock",
    { onRequest: fastify.authenticate({ role: UserRole.COORDINATOR }) },
    async (request, reply) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const {
        "x-amz-meta-original-name": originalName,
        "x-amz-meta-mime-type": mimeType,
        "x-amz-meta-document-type": type,
        "x-amz-meta-volunteer-id": volunteerId,
        "x-amz-meta-s3-key": s3Key,
      } = request.body as {
        "x-amz-meta-volunteer-id": string;
        "x-amz-meta-original-name": string;
        "x-amz-meta-document-type": DocumentType;
        "x-amz-meta-mime-type": string;
        "x-amz-meta-s3-key": string;
      };
      const document = new Document({
        volunteerId: Number(volunteerId),
        originalName,
        mimeType,
        s3Key,
        type,
      });
      const [, error] = await tryCatch(
        fastify.db.documentRepository.save(document),
      );

      if (error) {
        logger.error(
          `Error saving document for volunteer ${volunteerId}: ${error}`,
        );
        return reply.status(400).send({
          message: `Error saving document: ${error}`,
        });
      }

      return reply
        .code(201)
        .type("application/xml")
        .send(
          `<?xml version="1.0" encoding="UTF-8"?>
        <PostResponse>
          <Location>http://vmpub:5000/uploads/test.png</Location>
          <Bucket>mock-bucket</Bucket>
          <Key>test.png</Key>
          <ETag>"mock-etag-123"</ETag>
        </PostResponse>`,
        );
    },
  );

  fastify.delete<{ Params: { id: number } }>(
    "/",
    {
      onRequest: fastify.authenticate({ role: UserRole.COORDINATOR }),
      schema: {
        params: idParamSchema,
        response: {
          200: {
            type: "object",
            properties: { message: { type: "string" } },
            required: ["message"],
          },
          ...responseErrors,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const documentRepository = fastify.db.documentRepository;

      const [{ affected }, error] = await tryCatch(
        documentRepository.delete({ volunteerId: id }),
      );

      if (error) {
        logger.error(
          `Error deleting documents for volunteer_id${id}: ${error}`,
        );
        return reply.status(400).send({
          message: `Error deleting documents: ${error}`,
        });
      }

      if (affected === 0) {
        return reply.status(404).send({
          message: `Documents for volunteer_id:${id} not found.`,
        });
      }

      return reply.send({
        message: `${affected} document${affected !== 1 ? "s" : ""} for volunteer_id:${id} successfully deleted.`,
      });
    },
  );

  fastify.delete<{ Params: { id: number; type: DocumentType } }>(
    "/:type",
    {
      onRequest: fastify.authenticate({ role: UserRole.COORDINATOR }),
      schema: {
        params: idTypeParamSchema,
        response: {
          200: {
            type: "object",
            properties: { message: { type: "string" } },
            required: ["message"],
          },
          ...responseErrors,
        },
      },
    },
    async (request, reply) => {
      const { id, type } = request.params;
      const documentRepository = fastify.db.documentRepository;

      const [{ affected }, error] = await tryCatch(
        documentRepository.delete({ volunteerId: id, type }),
      );

      if (error) {
        logger.error(`Error deleting document for volunteer ${id}: ${error}`);
        return reply.status(400).send({
          message: `Error deleting document: ${error}`,
        });
      }

      if (affected === 0) {
        return reply.status(404).send({
          message: `Document of type:${type} for volunteer_id:${id} not found.`,
        });
      }

      return reply.send({
        message: `Document ${affected} of type:${type} for volunteer_id:${id} successfully deleted.`,
      });
    },
  );
}

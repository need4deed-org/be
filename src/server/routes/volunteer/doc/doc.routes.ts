import { Readable } from "stream";
import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { DocumentType } from "need4deed-sdk";
import Document from "../../../../data/entity/document.entity";
import { tryCatch } from "../../../../services/utils";
import {
  idParamSchema,
  idTypeParamSchema,
  responseErrors,
  volunteerDocSchemaGet200,
  volunteerDocSchemaGetMeta200,
  volunteerDocSchemaUploadMeta,
} from "../../../schema";
import { getVolunteerDocuments } from "../../../utils";

export default async function volunteerDocRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
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
      const documents = await getVolunteerDocuments(request.params.id);

      return reply.send({
        message: `Documents for volunteer ${request.params.id}`,
        data: documents,
      });
    },
  );

  fastify.get("/download", async (request, reply) => {
    const { url } = request.query as { url: string };
    const fileName = "test_pdf.pdf";

    const [urlObj, error] = await tryCatch(fetch(url));

    if (error) {
      fastify.log.error(`Error fetching document from URL ${url}: ${error}`);
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
  });

  fastify.get<{
    Params: { id: number };
    Querystring: { mimeType: string; originalName: string; type: DocumentType };
  }>(
    "/upload-meta",
    {
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
  }>("/s3-upload-mock", async (request, reply) => {
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
      fastify.log.error(
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
  });

  fastify.delete<{ Params: { id: number } }>(
    "/",
    {
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
        fastify.log.error(
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
        fastify.log.error(
          `Error deleting document for volunteer ${id}: ${error}`,
        );
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

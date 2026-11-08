import { isEmail } from "class-validator";
import { FastifyRequest } from "fastify";
import {
  ApiVolunteerImportPost,
  ApiVolunteerImportResult,
  ApiVolunteerImportRow,
  ApiVolunteerImportRowResult,
} from "need4deed-sdk";
import { In } from "typeorm";
import { NotFoundError } from "../../../config";
import Deal from "../../../data/entity/deal.entity";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Person from "../../../data/entity/person.entity";
import VolunteerAuditLog from "../../../data/entity/volunteer/volunteer-audit-log.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../../data/types";
import logger from "../../../logger";

type ExistingPerson = { id: number; registered: boolean; volunteer: boolean };

type PlannedRow = {
  row: ApiVolunteerImportRow;
  result: ApiVolunteerImportRowResult;
  postcodeId?: number;
  personId?: number;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

async function findExistingPersons(
  request: FastifyRequest,
  emails: string[],
): Promise<Map<string, ExistingPerson>> {
  if (emails.length === 0) {
    return new Map();
  }
  const rows: {
    id: number;
    email: string;
    registered: boolean;
    volunteer: boolean;
  }[] = await request.server.db.personRepository.manager.query(
    `SELECT p.id, LOWER(p.email) AS email,
            EXISTS (SELECT 1 FROM "user" u WHERE u.person_id = p.id) AS registered,
            EXISTS (SELECT 1 FROM volunteer v WHERE v.person_id = p.id) AS volunteer
       FROM person p
      WHERE LOWER(p.email) = ANY($1)
      ORDER BY p.id`,
    [emails],
  );
  const byEmail = new Map<string, ExistingPerson>();
  for (const { id, email, registered, volunteer } of rows) {
    const known = byEmail.get(email);
    byEmail.set(email, {
      id: known?.id ?? Number(id),
      registered: (known?.registered ?? false) || registered,
      volunteer: (known?.volunteer ?? false) || volunteer,
    });
  }
  return byEmail;
}

async function findPostcodeIds(
  request: FastifyRequest,
  values: string[],
): Promise<Map<string, number>> {
  const postcodes = await request.server.db.postcodeRepository.find({
    select: { id: true, value: true },
    where: { value: In(values) },
    order: { id: "ASC" },
  });
  const byValue = new Map<string, number>();
  for (const { id, value } of postcodes) {
    if (!byValue.has(value)) {
      byValue.set(value, id);
    }
  }
  return byValue;
}

async function planImport(
  request: FastifyRequest,
  rows: ApiVolunteerImportRow[],
): Promise<PlannedRow[]> {
  const emails = rows.map(({ email }) => normalizeEmail(email ?? ""));
  const [existing, postcodeIds] = await Promise.all([
    findExistingPersons(
      request,
      emails.filter((email) => isEmail(email)),
    ),
    findPostcodeIds(
      request,
      rows.map(({ postcode }) => (postcode ?? "").trim()),
    ),
  ]);

  const seen = new Set<string>();
  return rows.map((row, index) => {
    const email = emails[index];
    const result: ApiVolunteerImportRowResult = {
      row: index,
      email: row.email,
      outcome: "created",
    };
    const errors: string[] = [];
    if (!row.firstName?.trim()) {
      errors.push("firstName is required");
    }
    if (!isEmail(email)) {
      errors.push("email is not a valid address");
    }
    const postcodeId = postcodeIds.get((row.postcode ?? "").trim());
    if (!postcodeId) {
      errors.push(`postcode ${row.postcode} is unknown`);
    }
    const person = existing.get(email);
    if (person?.registered && !person.volunteer) {
      errors.push("email belongs to a registered account");
    }
    if (errors.length > 0) {
      return { row, result: { ...result, outcome: "invalid", errors } };
    }
    if (seen.has(email)) {
      return {
        row,
        result: {
          ...result,
          outcome: "skipped",
          skipReason: "duplicate-in-import",
        },
      };
    }
    seen.add(email);
    if (person?.volunteer) {
      return {
        row,
        result: {
          ...result,
          outcome: "skipped",
          skipReason: "already-volunteer",
        },
      };
    }
    return { row, result, postcodeId, personId: person?.id };
  });
}

function summarize(
  planned: PlannedRow[],
  dryRun: boolean,
): ApiVolunteerImportResult {
  const rows = planned.map(({ result }) => result);
  const count = (outcome: ApiVolunteerImportRowResult["outcome"]) =>
    rows.filter((row) => row.outcome === outcome).length;
  return {
    dryRun,
    created: count("created"),
    skipped: count("skipped"),
    invalid: count("invalid"),
    rows,
  };
}

async function writeImport(
  request: FastifyRequest,
  agent: Agent,
  planned: PlannedRow[],
): Promise<void> {
  const actorUserId = request.authUser?.id;
  await request.server.db.volunteerRepository.manager.transaction(
    async (manager) => {
      for (const plan of planned) {
        if (plan.result.outcome !== "created") {
          continue;
        }
        const { row } = plan;
        const personId =
          plan.personId ??
          (
            await manager.save(
              new Person({
                firstName: row.firstName.trim(),
                lastName: row.lastName?.trim() || undefined,
                email: normalizeEmail(row.email),
                phone: row.phone?.trim() || undefined,
              }),
            )
          ).id;
        const deal = await manager.save(
          new Deal({ type: DealType.VOLUNTEER, postcodeId: plan.postcodeId }),
        );
        const volunteer = await manager.save(
          new Volunteer({ dealId: deal.id, personId, ownerAgentId: agent.id }),
        );
        await manager.save(
          new VolunteerAuditLog({
            volunteerId: volunteer.id,
            type: "owner_changed",
            detail: `Imported for ${agent.title} (id:${agent.id}).`,
            actorUserId,
            occurredAt: new Date(),
          }),
        );
        plan.result.volunteerId = volunteer.id;
      }
    },
  );
}

export async function importOwnedVolunteers(
  request: FastifyRequest,
  agentId: number,
  { rows, dryRun = false }: ApiVolunteerImportPost,
): Promise<ApiVolunteerImportResult> {
  const agent = await request.server.db.agentRepository.findOne({
    select: { id: true, title: true },
    where: { id: agentId },
  });
  if (!agent) {
    throw new NotFoundError(`Agent (id:${agentId}) not found.`);
  }

  const planned = await planImport(request, rows);
  const invalid = planned.some(({ result }) => result.outcome === "invalid");
  if (dryRun || invalid) {
    return summarize(planned, dryRun);
  }

  await writeImport(request, agent, planned);
  const report = summarize(planned, false);
  request.server.notify
    .activity(
      `📥 Imported ${report.created} volunteer(s) for *${agent.title}* (${report.skipped} skipped).`,
    )
    .catch((err) => logger.warn(`volunteer import slack notice: ${err}`));
  return report;
}

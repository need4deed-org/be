import { isEmail } from "class-validator";
import { FastifyRequest } from "fastify";
import {
  ApiVolunteerImportPost,
  ApiVolunteerImportResult,
  ApiVolunteerImportRow,
  ApiVolunteerImportRowResult,
} from "need4deed-sdk";
import { EntityManager, In } from "typeorm";
import { NotFoundError } from "../../../config";
import Deal from "../../../data/entity/deal.entity";
import Address from "../../../data/entity/location/address.entity";
import Postcode from "../../../data/entity/location/postcode.entity";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Person from "../../../data/entity/person.entity";
import VolunteerAuditLog from "../../../data/entity/volunteer/volunteer-audit-log.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { normalizeEmail } from "../../../data/lib/email-transformer";
import { DealType } from "../../../data/types";
import { normalizePostcode } from "../../../data/utils/get-postcode";
import logger from "../../../logger";

type ExistingPerson = {
  id: number;
  firstName: string;
  addressId: number | null;
  volunteer: boolean;
};

type Plan = {
  row: ApiVolunteerImportRow;
  result: ApiVolunteerImportRowResult;
  email: string;
  postcodeId?: number;
  person?: ExistingPerson;
};

const sameName = (a: string, b: string) =>
  a.trim().localeCompare(b.trim(), "de", { sensitivity: "base" }) === 0;

const escapeSlack = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function findRegisteredEmails(
  manager: EntityManager,
  emails: string[],
): Promise<Set<string>> {
  const rows: { email: string }[] = await manager.query(
    `SELECT LOWER(u.email) AS email FROM "user" u WHERE LOWER(u.email) = ANY($1)
     UNION
     SELECT LOWER(p.email) FROM person p
       JOIN "user" u ON u.person_id = p.id
      WHERE LOWER(p.email) = ANY($1)`,
    [emails],
  );
  return new Set(rows.map(({ email }) => email));
}

async function findExistingPersons(
  manager: EntityManager,
  emails: string[],
): Promise<Map<string, ExistingPerson>> {
  const rows: {
    id: number;
    email: string;
    first_name: string;
    address_id: number | null;
    volunteer: boolean;
  }[] = await manager.query(
    `SELECT p.id, LOWER(p.email) AS email, p.first_name, p.address_id,
            EXISTS (SELECT 1 FROM volunteer v WHERE v.person_id = p.id) AS volunteer
       FROM person p
      WHERE LOWER(p.email) = ANY($1)
      ORDER BY volunteer DESC, p.id`,
    [emails],
  );
  const byEmail = new Map<string, ExistingPerson>();
  for (const row of rows) {
    if (!byEmail.has(row.email)) {
      byEmail.set(row.email, {
        id: Number(row.id),
        firstName: row.first_name,
        addressId: row.address_id === null ? null : Number(row.address_id),
        volunteer: row.volunteer,
      });
    }
  }
  return byEmail;
}

async function findPostcodeIds(
  manager: EntityManager,
  values: string[],
): Promise<Map<string, number>> {
  const postcodes = await manager.find(Postcode, {
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
  manager: EntityManager,
  rows: ApiVolunteerImportRow[],
): Promise<Plan[]> {
  const emails = rows.map(({ email }) => normalizeEmail(email ?? ""));
  const postcodes = rows.map(({ postcode }) =>
    normalizePostcode(postcode ?? ""),
  );
  const validEmails = emails.filter((email) => isEmail(email));
  const [registered, existing, postcodeIds] = await Promise.all([
    findRegisteredEmails(manager, validEmails),
    findExistingPersons(manager, validEmails),
    findPostcodeIds(manager, postcodes),
  ]);

  const seen = new Set<string>();
  return rows.map((row, index): Plan => {
    const email = emails[index];
    const result: ApiVolunteerImportRowResult = {
      row: index,
      email: row.email,
      outcome: "created",
    };
    const person = existing.get(email);
    const errors: string[] = [];
    if (!row.firstName?.trim()) {
      errors.push("firstName is required");
    }
    if (!isEmail(email)) {
      errors.push("email is not a valid address");
    }
    const postcodeId = postcodeIds.get(postcodes[index]);
    if (!postcodeId) {
      errors.push(`postcode ${row.postcode} is unknown`);
    }
    if (registered.has(email) && !person?.volunteer) {
      errors.push("email belongs to a registered account");
    } else if (
      person &&
      !person.volunteer &&
      row.firstName?.trim() &&
      !sameName(person.firstName ?? "", row.firstName)
    ) {
      errors.push("email belongs to an existing person with another name");
    }
    if (errors.length > 0) {
      return {
        row,
        email,
        result: { ...result, outcome: "invalid", errors },
      };
    }
    if (seen.has(email)) {
      return {
        row,
        email,
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
        email,
        result: {
          ...result,
          outcome: "skipped",
          skipReason: "already-volunteer",
        },
      };
    }
    return { row, email, result, postcodeId, person };
  });
}

function summarize(plans: Plan[], dryRun: boolean): ApiVolunteerImportResult {
  const rows = plans.map(({ result }) => result);
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

async function insertIds<T extends object>(
  manager: EntityManager,
  entity: new () => T,
  values: T[],
): Promise<number[]> {
  if (values.length === 0) {
    return [];
  }
  const { identifiers } = await manager.insert(entity, values);
  return identifiers.map(({ id }) => Number(id));
}

async function writeImport(
  manager: EntityManager,
  agent: Agent,
  plans: Plan[],
  actorUserId: number | undefined,
): Promise<void> {
  const toCreate = plans.filter(({ result }) => result.outcome === "created");
  const needAddress = toCreate.filter(({ person }) => !person?.addressId);
  const addressIds = await insertIds(
    manager,
    Address,
    needAddress.map(({ postcodeId }) => new Address({ postcodeId })),
  );
  const addressIdOf = new Map(
    needAddress.map((plan, i) => [plan, addressIds[i]]),
  );

  for (const plan of needAddress) {
    if (plan.person) {
      await manager.update(
        Person,
        { id: plan.person.id },
        { addressId: addressIdOf.get(plan) },
      );
    }
  }

  const fresh = toCreate.filter(({ person }) => !person);
  const freshIds = await insertIds(
    manager,
    Person,
    fresh.map(
      (plan) =>
        new Person({
          firstName: plan.row.firstName.trim(),
          lastName: plan.row.lastName?.trim() || undefined,
          email: plan.email,
          phone: plan.row.phone?.trim() || undefined,
          addressId: addressIdOf.get(plan),
        }),
    ),
  );
  const personIdOf = new Map(fresh.map((plan, i) => [plan, freshIds[i]]));

  const dealIds = await insertIds(
    manager,
    Deal,
    toCreate.map(
      ({ postcodeId }) => new Deal({ type: DealType.VOLUNTEER, postcodeId }),
    ),
  );
  const volunteerIds = await insertIds(
    manager,
    Volunteer,
    toCreate.map(
      (plan, i) =>
        new Volunteer({
          dealId: dealIds[i],
          personId: plan.person?.id ?? personIdOf.get(plan),
          ownerAgentId: agent.id,
        }),
    ),
  );
  const occurredAt = new Date();
  await insertIds(
    manager,
    VolunteerAuditLog,
    volunteerIds.map(
      (volunteerId) =>
        new VolunteerAuditLog({
          volunteerId,
          type: "owner_changed",
          detail: `Imported for ${agent.title} (id:${agent.id}).`,
          actorUserId,
          occurredAt,
        }),
    ),
  );
  toCreate.forEach((plan, i) => {
    plan.result.volunteerId = volunteerIds[i];
  });
}

export async function importOwnedVolunteers(
  request: FastifyRequest,
  agentId: number,
  { rows, dryRun = false }: ApiVolunteerImportPost,
): Promise<ApiVolunteerImportResult> {
  const { db, notify } = request.server;
  const agent = await db.agentRepository.findOne({
    select: { id: true, title: true },
    where: { id: agentId },
  });
  if (!agent) {
    throw new NotFoundError(`Agent (id:${agentId}) not found.`);
  }

  const report = await db.volunteerRepository.manager.transaction(
    async (manager) => {
      await manager.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
        "volunteer-import",
      ]);
      const plans = await planImport(manager, rows);
      const invalid = plans.some(({ result }) => result.outcome === "invalid");
      if (!dryRun && !invalid) {
        await writeImport(manager, agent, plans, request.authUser?.id);
      }
      return summarize(plans, dryRun);
    },
  );

  if (!report.dryRun && report.invalid === 0 && report.created > 0) {
    notify
      .activity(
        `📥 Imported ${report.created} volunteer(s) for *${escapeSlack(agent.title)}* (${report.skipped} skipped).`,
      )
      .catch((err) => logger.warn(`volunteer import slack notice: ${err}`));
  }
  return report;
}

import { isEmail } from "class-validator";
import { FastifyRequest } from "fastify";
import {
  ApiVolunteerImportAvailability,
  ApiVolunteerImportPost,
  ApiVolunteerImportResult,
  ApiVolunteerImportRow,
  ApiVolunteerImportRowResult,
  ByDay,
  DocumentStatusType,
  LangProficiency,
  Occasionally,
  OccasionalType,
  OpportunityVolunteerStatusType,
  ProfileVolunteeringType,
  TimeSlot,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import { EntityManager, In } from "typeorm";
import { NotFoundError } from "../../../config";
import Deal from "../../../data/entity/deal.entity";
import Address from "../../../data/entity/location/address.entity";
import Postcode from "../../../data/entity/location/postcode.entity";
import DealActivity from "../../../data/entity/m2m/deal-activity";
import DealDistrict from "../../../data/entity/m2m/deal-district";
import DealLanguage from "../../../data/entity/m2m/deal-language";
import DealSkill from "../../../data/entity/m2m/deal-skill";
import DealTimeslot from "../../../data/entity/m2m/deal-timeslot";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Person from "../../../data/entity/person.entity";
import Timeslot from "../../../data/entity/time/timeslot.entity";
import VolunteerAuditLog from "../../../data/entity/volunteer/volunteer-audit-log.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { normalizeEmail } from "../../../data/lib/email-transformer";
import { DealType } from "../../../data/types";
import {
  getPostcode,
  normalizePostcode,
} from "../../../data/utils/get-postcode";
import logger from "../../../logger";
import {
  buildDealTimeslots,
  WEEKDAYS,
} from "../../../services/dto/build-deal-timeslots";
import { VISIBLE_MATCH_STATUSES } from "../pii/visible-persons";
import { FALLBACK_PLZ } from "./get-or-create-submitter-person";
import { isStaffRole } from "./is-staff-role";

type ExistingPerson = {
  id: number;
  firstName: string;
  addressId: number | null;
  volunteerId: number | null;
  ownerAgentId: number | null;
};

type InUseReason =
  | "volunteer owned by another NGO"
  | "volunteer not matched with this NGO"
  | "registered account"
  | "person with another name"
  | "person without a volunteer profile";

type Profile = {
  languages: { languageId: number; proficiency?: LangProficiency }[];
  activityIds: number[];
  skillIds: number[];
  districtIds: number[];
  timeslots: [number, string][];
  statusType?: ProfileVolunteeringType;
  statusEngagement?: VolunteerStateEngagementType;
  statusCGC?: DocumentStatusType;
  statusVaccination?: DocumentStatusType;
  infoAbout?: string;
  infoExperience?: string;
  opportunities: {
    opportunityId: number;
    status: OpportunityVolunteerStatusType;
  }[];
};

type Plan = {
  row: ApiVolunteerImportRow;
  result: ApiVolunteerImportRowResult;
  email: string;
  postcodeId?: number;
  person?: ExistingPerson;
  profile?: Profile;
  link?: boolean;
  inUse?: InUseReason;
};

type Lookups = {
  registered: Set<string>;
  existing: Map<string, ExistingPerson>;
  matchedVolunteerIds: Set<number>;
  postcodeIds: Map<string, number>;
  languages: Map<string, number>;
  activities: Map<string, number>;
  skills: Map<string, number>;
  districts: Map<string, number>;
  opportunities: Map<string, number[]>;
};

const key = (value: string) => value.trim().toLowerCase();

const sameName = (a: string, b: string) =>
  a.trim().localeCompare(b.trim(), "de", { sensitivity: "base" }) === 0;

const escapeSlack = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const uniq = <T>(values: T[]) => [...new Set(values)];

function enumLookup<T extends string>(
  values: readonly T[],
  aliases: Record<string, T> = {},
): (value: string | undefined) => T | undefined {
  const byKey = new Map<string, T>(values.map((value) => [key(value), value]));
  Object.entries(aliases).forEach(([alias, value]) =>
    byKey.set(key(alias), value),
  );
  return (value) => (value === undefined ? undefined : byKey.get(key(value)));
}

const findProficiency = enumLookup(Object.values(LangProficiency));
const findDocumentStatus = enumLookup(Object.values(DocumentStatusType));
const findEngagement = enumLookup(
  Object.values(VolunteerStateEngagementType),
  Object.fromEntries(
    Object.values(VolunteerStateEngagementType).map((value) => [
      value.replace(/^vol-/, ""),
      value,
    ]),
  ),
);
const findVolunteerType = enumLookup(Object.values(ProfileVolunteeringType));
const findDay = enumLookup<ByDay | Occasionally>([
  ...Object.values(ByDay),
  ...Object.values(Occasionally),
]);
const findTimeSlot = enumLookup(
  Object.values(TimeSlot),
  TimeSlot as unknown as Record<string, TimeSlot>,
);
const findOccasionalType = enumLookup(Object.values(OccasionalType));

function toStatusType(
  types: ProfileVolunteeringType[],
): ProfileVolunteeringType | undefined {
  const distinct = uniq(types);
  const regular = distinct.includes(ProfileVolunteeringType.REGULAR);
  const accompanying = distinct.includes(ProfileVolunteeringType.ACCOMPANYING);
  if (
    distinct.includes(ProfileVolunteeringType.REGULAR_ACCOMPANYING) ||
    (regular && accompanying)
  ) {
    return ProfileVolunteeringType.REGULAR_ACCOMPANYING;
  }
  return distinct[0];
}

function toTimeslot({
  day,
  daytime,
}: ApiVolunteerImportAvailability): [number, string] | undefined {
  const foundDay = findDay(day);
  if (foundDay === Occasionally.OCCASIONALLY) {
    const occasional = findOccasionalType(daytime);
    return occasional ? [0, occasional] : undefined;
  }
  const slot = findTimeSlot(daytime);
  return foundDay && slot ? [WEEKDAYS.indexOf(foundDay), slot] : undefined;
}

async function findRegisteredEmails(
  manager: EntityManager,
  emails: string[],
): Promise<Set<string>> {
  const rows: { email: string }[] = await manager.query(
    `SELECT LOWER(u.email) AS email FROM "public"."user" u WHERE LOWER(u.email) = ANY($1)
     UNION
     SELECT LOWER(p.email) FROM "public"."person" p
       JOIN "public"."user" u ON u.person_id = p.id
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
    volunteer_id: number | null;
    owner_agent_id: number | null;
  }[] = await manager.query(
    `SELECT p.id, LOWER(p.email) AS email, p.first_name, p.address_id,
            v.id AS volunteer_id, v.owner_agent_id
       FROM "public"."person" p
       LEFT JOIN "public"."volunteer" v ON v.person_id = p.id
      WHERE LOWER(p.email) = ANY($1)
      ORDER BY v.id IS NULL, p.id`,
    [emails],
  );
  const byEmail = new Map<string, ExistingPerson>();
  const toId = (value: number | null) =>
    value === null ? null : Number(value);
  for (const row of rows) {
    if (!byEmail.has(row.email)) {
      byEmail.set(row.email, {
        id: Number(row.id),
        firstName: row.first_name,
        addressId: toId(row.address_id),
        volunteerId: toId(row.volunteer_id),
        ownerAgentId: toId(row.owner_agent_id),
      });
    }
  }
  return byEmail;
}

async function findMatchedVolunteerIds(
  manager: EntityManager,
  agentId: number,
  volunteerIds: number[],
): Promise<Set<number>> {
  if (volunteerIds.length === 0) {
    return new Set();
  }
  const rows: { volunteer_id: number }[] = await manager.query(
    `SELECT DISTINCT ov.volunteer_id
       FROM "public"."opportunity_volunteer" ov
       JOIN "public"."opportunity" o ON o.id = ov.opportunity_id
      WHERE o.agent_id = $1
        AND ov.status = ANY($2)
        AND ov.volunteer_id = ANY($3)
     UNION
     SELECT volunteer_id FROM "public"."volunteer_agent_link"
      WHERE agent_id = $1 AND volunteer_id = ANY($3)`,
    [agentId, VISIBLE_MATCH_STATUSES, volunteerIds],
  );
  return new Set(rows.map(({ volunteer_id }) => Number(volunteer_id)));
}

async function findPostcodeIds(
  manager: EntityManager,
  values: string[],
): Promise<Map<string, number>> {
  if (values.length === 0) {
    return new Map();
  }
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

async function findOptionIds(
  manager: EntityManager,
  table: "language" | "activity" | "skill" | "district",
  translationFk: string | null,
  titles: string[],
): Promise<Map<string, number>> {
  if (titles.length === 0) {
    return new Map();
  }
  const translated = translationFk
    ? `UNION ALL
       SELECT ft.${translationFk}, LOWER(TRIM(ft.translation)), 1
         FROM "public"."field_translation" ft
         JOIN "public"."language" l ON l.id = ft.language_id
        WHERE ft.${translationFk} IS NOT NULL
          AND ft.field_name = 'title'
          AND l.iso_code IN ('de', 'en')
          AND LOWER(TRIM(ft.translation)) = ANY($1)`
    : "";
  const rows: { id: number; title: string }[] = await manager.query(
    `SELECT id, title FROM (
       SELECT t.id, LOWER(TRIM(t.title)) AS title, 0 AS rank
         FROM "public"."${table}" t
        WHERE LOWER(TRIM(t.title)) = ANY($1)
       ${translated}
     ) found ORDER BY rank, id`,
    [titles],
  );
  const byTitle = new Map<string, number>();
  for (const { id, title } of rows) {
    if (!byTitle.has(title)) {
      byTitle.set(title, Number(id));
    }
  }
  return byTitle;
}

async function findAgentOpportunities(
  manager: EntityManager,
  agentId: number,
  titles: string[],
): Promise<Map<string, number[]>> {
  if (titles.length === 0) {
    return new Map();
  }
  const rows: { id: number; title: string }[] = await manager.query(
    `SELECT id, LOWER(TRIM(title)) AS title FROM "public"."opportunity"
      WHERE agent_id = $1 AND LOWER(TRIM(title)) = ANY($2)
      ORDER BY id`,
    [agentId, titles],
  );
  const byTitle = new Map<string, number[]>();
  for (const { id, title } of rows) {
    byTitle.set(title, [...(byTitle.get(title) ?? []), Number(id)]);
  }
  return byTitle;
}

async function loadLookups(
  manager: EntityManager,
  agentId: number,
  rows: ApiVolunteerImportRow[],
  emails: string[],
  postcodes: string[],
): Promise<Lookups> {
  const titles = (pick: (row: ApiVolunteerImportRow) => string[] | undefined) =>
    uniq(rows.flatMap((row) => (pick(row) ?? []).map(key)));
  const validEmails = emails.filter((email) => isEmail(email));
  const [
    registered,
    existing,
    postcodeIds,
    languages,
    activities,
    skills,
    districts,
    opportunities,
  ] = await Promise.all([
    findRegisteredEmails(manager, validEmails),
    findExistingPersons(manager, validEmails),
    findPostcodeIds(manager, uniq(postcodes.filter(Boolean))),
    findOptionIds(
      manager,
      "language",
      "translated_language_id",
      titles((row) => row.languages?.map(({ title }) => title)),
    ),
    findOptionIds(
      manager,
      "activity",
      "activity_id",
      titles((r) => r.activities),
    ),
    findOptionIds(
      manager,
      "skill",
      "skill_id",
      titles((r) => r.skills),
    ),
    findOptionIds(
      manager,
      "district",
      null,
      titles((r) => r.districts),
    ),
    findAgentOpportunities(
      manager,
      agentId,
      titles((row) => row.opportunities?.map(({ title }) => title)),
    ),
  ]);
  const volunteerIds = [...existing.values()]
    .map(({ volunteerId }) => volunteerId)
    .filter((id): id is number => id !== null);
  const matchedVolunteerIds = await findMatchedVolunteerIds(
    manager,
    agentId,
    volunteerIds,
  );
  return {
    registered,
    existing,
    matchedVolunteerIds,
    postcodeIds,
    languages,
    activities,
    skills,
    districts,
    opportunities,
  };
}

function resolveProfile(
  row: ApiVolunteerImportRow,
  lookups: Lookups,
  warnings: string[],
): Profile {
  const options = (
    label: string,
    values: string[] | undefined,
    byTitle: Map<string, number>,
  ) =>
    uniq(
      (values ?? []).flatMap((value) => {
        const id = byTitle.get(key(value));
        if (id === undefined) {
          warnings.push(`${label} "${value}" is unknown`);
          return [];
        }
        return [id];
      }),
    );
  const enumValue = <T>(
    label: string,
    value: string | undefined,
    find: (value: string | undefined) => T | undefined,
  ): T | undefined => {
    if (value === undefined || value.trim() === "") {
      return undefined;
    }
    const found = find(value);
    if (found === undefined) {
      warnings.push(`${label} "${value}" is unknown`);
    }
    return found;
  };

  const languages = new Map<number, LangProficiency | undefined>();
  for (const { title, proficiency } of row.languages ?? []) {
    const languageId = lookups.languages.get(key(title));
    if (languageId === undefined) {
      warnings.push(`language "${title}" is unknown`);
      continue;
    }
    languages.set(
      languageId,
      enumValue("language level", proficiency, findProficiency) ??
        languages.get(languageId),
    );
  }

  const timeslots = new Map<string, [number, string]>();
  for (const entry of row.availability ?? []) {
    const timeslot = toTimeslot(entry);
    if (!timeslot) {
      warnings.push(`availability "${entry.day} ${entry.daytime}" is unknown`);
      continue;
    }
    timeslots.set(timeslot.join(" "), timeslot);
  }

  const types = (row.statusTypes ?? []).flatMap((type) => {
    const found = enumValue("volunteer type", type, findVolunteerType);
    return found ? [found] : [];
  });

  const opportunities = new Map<number, OpportunityVolunteerStatusType>();
  for (const { title, status } of row.opportunities ?? []) {
    const ids = lookups.opportunities.get(key(title)) ?? [];
    if (ids.length !== 1) {
      warnings.push(
        ids.length === 0
          ? `opportunity "${title}" is not one of this NGO's opportunities`
          : `opportunity "${title}" matches several of this NGO's opportunities`,
      );
      continue;
    }
    opportunities.set(ids[0], status);
  }

  const statusType = toStatusType(types);
  const keptTypes =
    statusType === ProfileVolunteeringType.REGULAR_ACCOMPANYING
      ? [
          ProfileVolunteeringType.REGULAR,
          ProfileVolunteeringType.ACCOMPANYING,
          ProfileVolunteeringType.REGULAR_ACCOMPANYING,
        ]
      : [statusType];
  uniq(types)
    .filter((type) => !keptTypes.includes(type))
    .forEach((type) =>
      warnings.push(
        `volunteer type "${type}" dropped: only ${statusType} kept`,
      ),
    );

  return {
    languages: [...languages].map(([languageId, proficiency]) => ({
      languageId,
      ...(proficiency ? { proficiency } : {}),
    })),
    activityIds: options("activity", row.activities, lookups.activities),
    skillIds: options("skill", row.skills, lookups.skills),
    districtIds: options("district", row.districts, lookups.districts),
    timeslots: [...timeslots.values()],
    statusType,
    statusEngagement: enumValue(
      "engagement status",
      row.statusEngagement,
      findEngagement,
    ),
    statusCGC: enumValue(
      "good conduct certificate",
      row.goodConductCertificate,
      findDocumentStatus,
    ),
    statusVaccination: enumValue(
      "measles vaccination",
      row.measlesVaccination,
      findDocumentStatus,
    ),
    infoAbout: row.infoAbout?.trim() || undefined,
    infoExperience: row.infoExperience?.trim() || undefined,
    opportunities: [...opportunities].map(([opportunityId, status]) => ({
      opportunityId,
      status,
    })),
  };
}

// The NGO only learns "email in use"; the reason goes to coordinators.
function classifyExisting(
  agentId: number,
  row: ApiVolunteerImportRow,
  email: string,
  person: ExistingPerson | undefined,
  lookups: Lookups,
  canReusePerson: boolean,
): Pick<Plan, "link" | "inUse"> | "connected" | "new" {
  if (person?.volunteerId) {
    if (person.ownerAgentId === agentId) {
      return "connected";
    }
    if (person.ownerAgentId !== null) {
      return { inUse: "volunteer owned by another NGO" };
    }
    return lookups.matchedVolunteerIds.has(person.volunteerId)
      ? { link: true }
      : { inUse: "volunteer not matched with this NGO" };
  }
  if (lookups.registered.has(email)) {
    return { inUse: "registered account" };
  }
  if (person && !canReusePerson) {
    return { inUse: "person without a volunteer profile" };
  }
  if (person && !sameName(person.firstName ?? "", row.firstName)) {
    return { inUse: "person with another name" };
  }
  return "new";
}

function planRow(
  agentId: number,
  row: ApiVolunteerImportRow,
  index: number,
  email: string,
  postcode: string,
  lookups: Lookups,
  seen: Set<string>,
  canReusePerson: boolean,
): Plan {
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
  if (errors.length > 0) {
    return { row, email, result: { ...result, outcome: "invalid", errors } };
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

  const person = lookups.existing.get(email);
  const existing = classifyExisting(
    agentId,
    row,
    email,
    person,
    lookups,
    canReusePerson,
  );
  if (existing !== "new") {
    const connected = existing === "connected" || existing.link === true;
    return {
      row,
      email,
      person,
      ...(existing === "connected" ? {} : existing),
      result: {
        ...result,
        outcome: "skipped",
        skipReason: connected ? "connected-existing" : "email-in-use",
        ...(connected ? { volunteerId: person?.volunteerId ?? undefined } : {}),
      },
    };
  }

  const warnings: string[] = [];
  const postcodeId = postcode ? lookups.postcodeIds.get(postcode) : undefined;
  if (postcode && !postcodeId) {
    warnings.push(`postcode "${row.postcode}" is unknown`);
  }
  const profile = resolveProfile(row, lookups, warnings);
  return {
    row,
    email,
    person,
    postcodeId,
    profile,
    result: warnings.length > 0 ? { ...result, warnings } : result,
  };
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

async function insertRows<T extends object>(
  manager: EntityManager,
  entity: new () => T,
  values: T[],
): Promise<void> {
  if (values.length > 0) {
    await manager.insert(entity, values);
  }
}

async function saveTimeslotIds(
  manager: EntityManager,
  plans: Plan[],
): Promise<Map<string, number>> {
  const tuples = new Map<string, [number, string]>();
  plans.forEach(({ profile }) =>
    profile?.timeslots.forEach((tuple) => tuples.set(tuple.join(" "), tuple)),
  );
  const keys = [...tuples.keys()];
  const dealTimeslots = await buildDealTimeslots([...tuples.values()], null);
  const ids = new Map<string, number>();
  for (const [i, { timeslot }] of dealTimeslots.entries()) {
    const saved = timeslot.id
      ? timeslot
      : await manager.save(Timeslot, timeslot);
    ids.set(keys[i], saved.id);
  }
  return ids;
}

async function writeDealOptions(
  manager: EntityManager,
  plans: Plan[],
  dealIds: number[],
): Promise<void> {
  const timeslotIds = await saveTimeslotIds(manager, plans);
  const each = <T>(pick: (profile: Profile, dealId: number) => T[]) =>
    plans.flatMap(({ profile }, i) =>
      profile ? pick(profile, dealIds[i]) : [],
    );
  await insertRows(
    manager,
    DealLanguage,
    each(({ languages }, dealId) =>
      languages.map((language) => new DealLanguage({ dealId, ...language })),
    ),
  );
  await insertRows(
    manager,
    DealActivity,
    each(({ activityIds }, dealId) =>
      activityIds.map((activityId) => new DealActivity({ dealId, activityId })),
    ),
  );
  await insertRows(
    manager,
    DealSkill,
    each(({ skillIds }, dealId) =>
      skillIds.map((skillId) => new DealSkill({ dealId, skillId })),
    ),
  );
  await insertRows(
    manager,
    DealDistrict,
    each(({ districtIds }, dealId) =>
      districtIds.map((districtId) => new DealDistrict({ dealId, districtId })),
    ),
  );
  await insertRows(
    manager,
    DealTimeslot,
    each(({ timeslots }, dealId) =>
      timeslots.map(
        (tuple) =>
          new DealTimeslot({
            dealId,
            timeslotId: timeslotIds.get(tuple.join(" ")),
          }),
      ),
    ),
  );
}

async function writeImport(
  manager: EntityManager,
  agent: Agent,
  plans: Plan[],
  actorUserId: number | undefined,
): Promise<void> {
  const toLink = plans.filter(
    ({ link, person }) => link && person?.volunteerId,
  );
  if (toLink.length > 0) {
    const linked: { volunteer_id: number }[] = await manager.query(
      `INSERT INTO "public"."volunteer_agent_link" (volunteer_id, agent_id)
       SELECT unnest($1::int[]), $2
       ON CONFLICT DO NOTHING
       RETURNING volunteer_id`,
      [toLink.map(({ person }) => person?.volunteerId), agent.id],
    );
    const occurredAt = new Date();
    await insertRows(
      manager,
      VolunteerAuditLog,
      linked.map(
        ({ volunteer_id }) =>
          new VolunteerAuditLog({
            volunteerId: Number(volunteer_id),
            type: "owner_changed",
            detail: `Connected to ${agent.title} (id:${agent.id}) by an import; the owner stays need4deed.`,
            actorUserId,
            occurredAt,
          }),
      ),
    );
  }

  const toCreate = plans.filter(({ result }) => result.outcome === "created");
  const needAddress = toCreate.filter(
    ({ person, postcodeId }) => postcodeId && !person?.addressId,
  );
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

  const fallbackPostcodeId = toCreate.some(({ postcodeId }) => !postcodeId)
    ? (await getPostcode(FALLBACK_PLZ, { manager }))?.id
    : undefined;
  const dealIds = await insertIds(
    manager,
    Deal,
    toCreate.map(
      ({ postcodeId }) =>
        new Deal({
          type: DealType.VOLUNTEER,
          postcodeId: postcodeId ?? fallbackPostcodeId,
        }),
    ),
  );
  await writeDealOptions(manager, toCreate, dealIds);

  const volunteerIds = await insertIds(
    manager,
    Volunteer,
    toCreate.map(({ person, profile }, i) => {
      const volunteer = new Volunteer({
        dealId: dealIds[i],
        personId: person?.id ?? personIdOf.get(toCreate[i]),
        ownerAgentId: agent.id,
      });
      const fields: Partial<Volunteer> = {
        statusType: profile?.statusType,
        statusEngagement: profile?.statusEngagement,
        statusCGC: profile?.statusCGC,
        statusVaccination: profile?.statusVaccination,
        infoAbout: profile?.infoAbout,
        infoExperience: profile?.infoExperience,
      };
      Object.entries(fields).forEach(([field, value]) => {
        if (value !== undefined) {
          Object.assign(volunteer, { [field]: value });
        }
      });
      return volunteer;
    }),
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

  // save(), not insert(): the match subscriber must run.
  for (const [i, { profile }] of toCreate.entries()) {
    for (const { opportunityId, status } of profile?.opportunities ?? []) {
      await manager.save(
        new OpportunityVolunteer({
          volunteerId: volunteerIds[i],
          opportunityId,
          status,
        }),
        { data: { actorUserId } },
      );
    }
  }

  toCreate.forEach((plan, i) => {
    plan.result.volunteerId = volunteerIds[i];
  });
  await warnOverriddenEngagement(manager, toCreate, volunteerIds);
}

async function warnOverriddenEngagement(
  manager: EntityManager,
  plans: Plan[],
  volunteerIds: number[],
): Promise<void> {
  const requested = new Map(
    plans.flatMap(({ profile, result }, i) =>
      profile?.statusEngagement && profile.opportunities.length > 0
        ? [[volunteerIds[i], { wanted: profile.statusEngagement, result }]]
        : [],
    ),
  );
  if (requested.size === 0) {
    return;
  }
  const stored = await manager.find(Volunteer, {
    select: { id: true, statusEngagement: true },
    where: { id: In([...requested.keys()]) },
  });
  for (const { id, statusEngagement } of stored) {
    const { wanted, result } = requested.get(id)!;
    if (statusEngagement !== wanted) {
      result.warnings = [
        ...(result.warnings ?? []),
        `engagement status "${wanted}" replaced by "${statusEngagement}" from the opportunity matches`,
      ];
    }
  }
}

function slackNotice(
  agent: Agent,
  report: ApiVolunteerImportResult,
  plans: Plan[],
) {
  const name = ({ row }: Plan) =>
    escapeSlack(`${row.firstName ?? ""} ${row.lastName ?? ""}`.trim());
  const existing = plans.flatMap((plan) => {
    const { result, email, person } = plan;
    if (plan.link) {
      return [
        `• connected existing volunteer ${name(plan)} <${escapeSlack(email)}> (id:${person?.volunteerId})`,
      ];
    }
    if (result.skipReason === "email-in-use") {
      return [
        `• not imported, email in use (${plan.inUse}): ${name(plan)} <${escapeSlack(email)}>${person?.volunteerId ? ` (volunteer id:${person.volunteerId})` : ""}`,
      ];
    }
    return [];
  });
  if (report.created === 0 && existing.length === 0) {
    return undefined;
  }
  return [
    `📥 Imported ${report.created} volunteer(s) for *${escapeSlack(agent.title)}* (id:${agent.id}); ${report.skipped} skipped, ${report.invalid} invalid.`,
    ...existing,
  ].join("\n");
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

  const canReusePerson = isStaffRole(request.authUser?.role);
  const emails = rows.map(({ email }) => normalizeEmail(email ?? ""));
  const postcodes = rows.map(({ postcode }) =>
    postcode?.trim() ? normalizePostcode(postcode) : "",
  );

  const { report, plans } = await db.volunteerRepository.manager.transaction(
    async (manager) => {
      await manager.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
        "volunteer-import",
      ]);
      const lookups = await loadLookups(
        manager,
        agent.id,
        rows,
        emails,
        postcodes,
      );
      const seen = new Set<string>();
      const plans = rows.map((row, index) =>
        planRow(
          agent.id,
          row,
          index,
          emails[index],
          postcodes[index],
          lookups,
          seen,
          canReusePerson,
        ),
      );
      if (!dryRun) {
        await writeImport(manager, agent, plans, request.authUser?.id);
      }
      return { report: summarize(plans, dryRun), plans };
    },
  );

  const notice = !report.dryRun && slackNotice(agent, report, plans);
  if (notice) {
    notify
      .activity(notice)
      .catch((err) => logger.warn(`volunteer import slack notice: ${err}`));
  }
  return report;
}

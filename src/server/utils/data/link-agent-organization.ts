import { AgentMembershipStatus, AgentRoleType } from "need4deed-sdk";
import { EntityManager } from "typeorm";
import { domainOrganizationTitles } from "../../../data/utils/organization-titles";
import logger from "../../../logger";
import { websiteDomainSql } from "./ensure-domain-organization";
import { isFreeEmailDomain } from "./free-email-domains";

type Queryable = Pick<EntityManager, "query">;

const emailDomain = (email: string | null | undefined) =>
  email
    ?.split("@")
    .pop()
    ?.trim()
    .toLowerCase()
    .replace(/^www\./, "") || null;

export async function findDomainOrganizationId(
  db: Queryable,
  domain: string | null,
): Promise<number | null> {
  if (!domain || isFreeEmailDomain(domain)) {
    return null;
  }
  const titles = domainOrganizationTitles(domain);
  if (titles && titles.length !== 1) {
    return null;
  }
  const rows: { id: number }[] = await db.query(
    `SELECT "id" FROM "organization"
     WHERE ${websiteDomainSql('"website"')} = $1 OR lower("title") = $2`,
    [domain, titles ? titles[0].toLowerCase() : null],
  );
  return rows.length === 1 ? rows[0].id : null;
}

async function getAgentMemberDomains(
  db: Queryable,
  agentId: number,
): Promise<string[][]> {
  const rows: { emails: (string | null)[] }[] = await db.query(
    `SELECT CASE WHEN coalesce(p."email", '') <> '' THEN ARRAY[p."email"]
                 ELSE coalesce(array_agg(u."email") FILTER (WHERE u."email" IS NOT NULL), '{}')
            END AS "emails"
     FROM "agent_person" ap
     JOIN "person" p ON p."id" = ap."person_id"
     LEFT JOIN "user" u ON u."person_id" = p."id"
     WHERE ap."agent_id" = $1 AND ap."status" = $2
     GROUP BY ap."id", p."email", ap."role"
     ORDER BY (ap."role" = $3) DESC, ap."id"`,
    [
      agentId,
      AgentMembershipStatus.ACTIVE,
      AgentRoleType.VOLUNTEER_COORDINATOR,
    ],
  );
  return rows.map(({ emails }) =>
    emails.map(emailDomain).filter((d): d is string => !!d),
  );
}

export async function findAgentDomainOrganizationId(
  db: Queryable,
  agentId: number,
): Promise<number | null> {
  const [representativeDomains = [], ...memberDomains] =
    await getAgentMemberDomains(db, agentId);
  for (const domain of representativeDomains) {
    const id = await findDomainOrganizationId(db, domain);
    if (id) {
      return id;
    }
  }
  const memberOrganizationIds = new Set<number>();
  for (const domain of new Set(memberDomains.flat())) {
    const id = await findDomainOrganizationId(db, domain);
    if (id) {
      memberOrganizationIds.add(id);
    }
  }
  return memberOrganizationIds.size === 1
    ? [...memberOrganizationIds][0]
    : null;
}

export async function linkAgentToDomainOrganization(
  db: Queryable,
  agentId: number,
): Promise<boolean> {
  const organizationId = await findAgentDomainOrganizationId(db, agentId);
  if (!organizationId) {
    return false;
  }
  const [, linked]: [unknown, number] = await db.query(
    `UPDATE "agent" SET "organization_id" = $1
     WHERE "id" = $2 AND "organization_id" IS NULL`,
    [organizationId, agentId],
  );
  return linked > 0;
}

export async function linkAgentToDomainOrganizationSafely(
  db: Queryable,
  agentId: number,
): Promise<void> {
  try {
    await linkAgentToDomainOrganization(db, agentId);
  } catch (err) {
    logger.warn(
      `link-agent-organization: agent ${agentId} not linked: ${err instanceof Error ? err.message : err}`,
    );
  }
}

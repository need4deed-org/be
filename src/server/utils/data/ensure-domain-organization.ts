import { EntityManager } from "typeorm";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Organization from "../../../data/entity/organization.entity";

export const websiteDomainSql = (column: string) =>
  `rtrim(regexp_replace(regexp_replace(lower(btrim(coalesce(${column}, ''))), '^[a-z][a-z0-9+.-]*://', ''), '^www\\.|[:/?#].*$', '', 'g'), '.')`;

const findDomainOrganization = (manager: EntityManager, domain: string) =>
  manager
    .getRepository(Organization)
    .createQueryBuilder("organization")
    .where(
      `${websiteDomainSql("organization.website")} = :domain OR lower(organization.title) = :domain`,
      { domain },
    )
    .getExists();

export async function ensureDomainOrganization(
  manager: EntityManager,
  domain: string,
): Promise<void> {
  if (!(await findDomainOrganization(manager, domain))) {
    await manager
      .getRepository(Organization)
      .save(new Organization({ title: domain, website: domain }));
  }
}

// Only an untouched, unlinked auto-created Träger is safe to move or drop.
export async function renameDomainOrganization(
  manager: EntityManager,
  from: string,
  to: string,
): Promise<void> {
  const repository = manager.getRepository(Organization);
  const stale =
    from !== to && (await repository.findOneBy({ title: from, website: from }));
  if (
    stale &&
    !(await manager.getRepository(Agent).existsBy({ organizationId: stale.id }))
  ) {
    if (await findDomainOrganization(manager, to)) {
      await repository.delete({ id: stale.id });
    } else {
      await repository.update({ id: stale.id }, { title: to, website: to });
    }
    return;
  }
  await ensureDomainOrganization(manager, to);
}

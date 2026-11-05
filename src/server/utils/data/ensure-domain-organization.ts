import { EntityManager, In, IsNull } from "typeorm";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Organization from "../../../data/entity/organization.entity";
import TrustedDomain from "../../../data/entity/trusted-domain.entity";
import { domainOrganizationTitles } from "../../../data/utils/organization-titles";

export const websiteDomainSql = (column: string) =>
  `rtrim(regexp_replace(regexp_replace(lower(btrim(coalesce(${column}, ''))), '^[a-z][a-z0-9+.-]*://', ''), '^www\\.|[:/?#].*$', '', 'g'), '.')`;

const hostOf = (domain: string) => domain.replace(/^www\./, "");

const findDomainOrganization = (
  manager: EntityManager,
  domain: string,
  titles: string[],
  excludeId = 0,
) =>
  manager
    .getRepository(Organization)
    .createQueryBuilder("organization")
    .where(
      `(${websiteDomainSql("organization.website")} = :host OR lower(organization.title) IN (:...titles))`,
      {
        host: hostOf(domain),
        titles: [domain, ...titles].map((t) => t.toLowerCase()),
      },
    )
    .andWhere("organization.id <> :excludeId", { excludeId })
    .getExists();

export async function ensureDomainOrganization(
  manager: EntityManager,
  domain: string,
): Promise<void> {
  const titles = domainOrganizationTitles(domain);
  if (titles && !(await findDomainOrganization(manager, domain, titles))) {
    await manager
      .getRepository(Organization)
      .save(
        titles.map((title) => new Organization({ title, website: domain })),
      );
  }
}

// Only an untouched, unlinked, unshared auto-created Träger is safe to move or drop.
async function findStaleOrganization(
  manager: EntityManager,
  domain: string,
  renamedTo: string,
): Promise<Organization | null> {
  const stale = await manager.getRepository(Organization).findOneBy({
    title: hostOf(domain),
    website: domain,
    email: IsNull(),
    phone: IsNull(),
    personId: IsNull(),
    addressId: IsNull(),
  });
  if (
    !stale ||
    (await manager.getRepository(Agent).existsBy({ organizationId: stale.id }))
  ) {
    return null;
  }
  const host = hostOf(domain);
  const sharing = [domain, host, `www.${host}`].filter((d) => d !== renamedTo);
  const shared = await manager
    .getRepository(TrustedDomain)
    .existsBy({ domain: In(sharing) });
  return shared ? null : stale;
}

export async function renameDomainOrganization(
  manager: EntityManager,
  from: string,
  to: string,
): Promise<void> {
  const stale = from !== to && (await findStaleOrganization(manager, from, to));
  if (!stale) {
    await ensureDomainOrganization(manager, to);
    return;
  }
  const repository = manager.getRepository(Organization);
  const titles = domainOrganizationTitles(to);
  if (
    !titles ||
    (await findDomainOrganization(manager, to, titles, stale.id))
  ) {
    await repository.delete({ id: stale.id });
  } else {
    await repository.update(
      { id: stale.id },
      { title: titles[0], website: to },
    );
  }
}

import { EntityManager } from "typeorm";
import Organization from "../../../data/entity/organization.entity";

export const websiteDomainSql = (column: string) =>
  `lower(regexp_replace(regexp_replace(coalesce(${column}, ''), '^(https?://)?(www\\.)?', ''), '/.*$', ''))`;

export async function ensureDomainOrganization(
  manager: EntityManager,
  domain: string,
): Promise<void> {
  const repository = manager.getRepository(Organization);
  const existing = await repository
    .createQueryBuilder("organization")
    .where(
      `${websiteDomainSql("organization.website")} = :domain OR lower(organization.title) = :domain`,
      { domain },
    )
    .getOne();
  if (!existing) {
    await repository.save(new Organization({ title: domain, website: domain }));
  }
}

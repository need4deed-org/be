import { DataSource, EntityManager } from "typeorm";
import { dataSource } from "../../../data/data-source";
import TrustedDomain from "../../../data/entity/trusted-domain.entity";

export async function isEmailDomainTrusted(
  email: string,
  manager: DataSource | EntityManager = dataSource,
): Promise<boolean> {
  const domain = email.split("@").pop()?.toLowerCase();
  if (!domain) {
    return false;
  }
  return (await manager.getRepository(TrustedDomain).countBy({ domain })) > 0;
}

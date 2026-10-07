import { dataSource } from "../../../data/data-source";
import TrustedDomain from "../../../data/entity/trusted-domain.entity";

export async function isEmailDomainTrusted(email: string): Promise<boolean> {
  const domain = email.split("@").pop()?.toLowerCase();
  if (!domain) {
    return false;
  }
  return (
    (await dataSource.getRepository(TrustedDomain).countBy({ domain })) > 0
  );
}

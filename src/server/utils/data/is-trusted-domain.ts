import { dataSource } from "../../../data/data-source";
import TrustedDomain from "../../../data/entity/trusted-domain.entity";

/**
 * True when the email's domain is on the trusted allowlist (case-insensitive).
 * Used by the agent-registration domain checks (POST /user AGENT gate and
 * resolveJoinStatus) so a brand-new representative from a known RAC domain can
 * register even when their org has no existing member yet.
 */
export async function isEmailDomainTrusted(email: string): Promise<boolean> {
  const domain = email.split("@").pop()?.toLowerCase();
  if (!domain) {
    return false;
  }
  return (
    (await dataSource.getRepository(TrustedDomain).countBy({ domain })) > 0
  );
}

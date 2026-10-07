import { isFreeEmailDomain } from "./free-email-domains";
import { isEmailDomainTrusted } from "./is-trusted-domain";

export async function isAgentDomainAllowed(
  email: string,
  hasExistingMemberOnDomain: (domain: string) => Promise<boolean>,
): Promise<boolean> {
  const domain = (email || "").split("@").pop()?.toLowerCase();
  if (!domain) {
    return false;
  }

  const matchedExistingMember =
    !isFreeEmailDomain(domain) && (await hasExistingMemberOnDomain(domain));

  return matchedExistingMember || (await isEmailDomainTrusted(email));
}

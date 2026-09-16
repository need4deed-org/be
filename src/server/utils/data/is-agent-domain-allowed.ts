import { isFreeEmailDomain } from "./free-email-domains";
import { isEmailDomainTrusted } from "./is-trusted-domain";

/**
 * Shared authorization rule for the two AGENT-domain gates (POST /user's
 * AGENT signup and resolveJoinStatus's join-existing-agent flow): an
 * existing-member/agent match on the email's domain only counts when that
 * domain isn't a known free/consumer provider — anyone can register an
 * address there, so one existing match says nothing about this registrant.
 * A free domain can still pass via an explicit TrustedDomain entry
 * (coordinator override) (be#1001).
 */
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

// Known free/consumer email providers. AGENT (NGO) signup and agent-join
// domain checks treat these as never sufficient on their own — an existing
// agent member sharing one of these domains must not auto-approve a new
// signup on it, since anyone can register a free-provider address (be#1001).
// A real org genuinely operating off one of these domains still gets in via
// an explicit TrustedDomain entry (coordinator override).
// Kept in sync with the consumer-webmail exclusions the
// seed-organization-from-agent-domains migration already identified
// (aol.com, gmx.de, gmx.net, t-online.de, ukr.net) — those are known-good
// signal for this same "not a real org domain" judgment, so any domain
// added/removed there should be mirrored here.
export const FREE_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
  "gmail.com",
  "googlemail.com",
  "gmx.de",
  "gmx.net",
  "gmx.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "icloud.com",
  "aol.com",
  "protonmail.com",
  "mail.com",
  "t-online.de",
  "ukr.net",
]);

export function isFreeEmailDomain(domain: string | undefined): boolean {
  return !!domain && FREE_EMAIL_DOMAINS.has(domain.toLowerCase());
}

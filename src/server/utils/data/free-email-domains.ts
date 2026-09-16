// Known free/consumer email providers. AGENT (NGO) signup and agent-join
// domain checks treat these as never sufficient on their own — an existing
// agent member sharing one of these domains must not auto-approve a new
// signup on it, since anyone can register a free-provider address (be#1001).
// A real org genuinely operating off one of these domains still gets in via
// an explicit TrustedDomain entry (coordinator override).
export const FREE_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
  "gmail.com",
  "googlemail.com",
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
]);

export function isFreeEmailDomain(domain: string | undefined): boolean {
  return !!domain && FREE_EMAIL_DOMAINS.has(domain.toLowerCase());
}

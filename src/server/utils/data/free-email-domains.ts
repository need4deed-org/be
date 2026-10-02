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

import { describe, expect, it } from "vitest";
import { isFreeEmailDomain } from "../../../../server/utils/data/free-email-domains";

describe("isFreeEmailDomain", () => {
  it("is true for known free/consumer providers, case-insensitively", () => {
    expect(isFreeEmailDomain("gmail.com")).toBe(true);
    expect(isFreeEmailDomain("Gmail.COM")).toBe(true);
  });

  // be#1005 review: these three are already flagged as consumer webmail by
  // seed-organization-from-agent-domains.ts's ORGANIZATION_DOMAINS exclusion
  // comment (alongside aol.com and gmx.net, which were already listed here)
  // — missing them left be#1001's exploit open on exactly these domains.
  it("is true for gmx.de, t-online.de, and ukr.net", () => {
    expect(isFreeEmailDomain("gmx.de")).toBe(true);
    expect(isFreeEmailDomain("t-online.de")).toBe(true);
    expect(isFreeEmailDomain("ukr.net")).toBe(true);
  });

  it("is false for an organization domain", () => {
    expect(isFreeEmailDomain("need4deed.org")).toBe(false);
  });

  it("is false for undefined", () => {
    expect(isFreeEmailDomain(undefined)).toBe(false);
  });
});

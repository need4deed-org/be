import { describe, expect, it } from "vitest";
import { ORGANIZATION_DOMAINS } from "../../../data/migrations/1786109950000-seed-organization-from-agent-domains";
import {
  ORGANIZATION_DOMAIN_ALIASES,
  ORGANIZATION_TITLES_BY_DOMAIN,
} from "../../../data/migrations/1790769607004-rename-domain-seeded-organizations";

// be#1061: the curated rename has to cover exactly what was seeded, and must
// never produce a title that collides (title is unique) or still looks like
// a domain.
describe("RenameDomainSeededOrganizations mapping", () => {
  const renamedDomains = ORGANIZATION_TITLES_BY_DOMAIN.map(([d]) => d);
  const aliases = ORGANIZATION_DOMAIN_ALIASES.map(([alias]) => alias);

  it("covers every seeded domain exactly once, as a rename or an alias", () => {
    expect([...renamedDomains, ...aliases].sort()).toEqual(
      [...ORGANIZATION_DOMAINS].sort(),
    );
  });

  it("merges each alias into a domain that is itself renamed", () => {
    for (const [, canonical] of ORGANIZATION_DOMAIN_ALIASES) {
      expect(renamedDomains).toContain(canonical);
    }
  });

  it("has unique titles", () => {
    const titles = ORGANIZATION_TITLES_BY_DOMAIN.map(([, t]) => t);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("has no domain-shaped titles", () => {
    for (const [, title] of ORGANIZATION_TITLES_BY_DOMAIN) {
      expect(title).not.toMatch(/\.(de|org|com|net|berlin|eu|info|io)\b/i);
    }
  });
});

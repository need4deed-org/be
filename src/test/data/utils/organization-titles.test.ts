import { afterEach, describe, expect, it, vi } from "vitest";
import { ORGANIZATION_DOMAINS } from "../../../data/migrations/1786109950000-seed-organization-from-agent-domains";
import {
  BUILTIN_ORGANIZATION_ALIASES,
  BUILTIN_ORGANIZATION_TITLES,
  loadOrganizationTitleMap,
} from "../../../data/utils/organization-titles";

// be#1061: the built-in rename map has to cover exactly what was seeded, and
// must never produce a title that collides (title is unique) or still looks
// like a domain.
describe("RenameDomainSeededOrganizations built-in map", () => {
  const renamedDomains = Object.keys(BUILTIN_ORGANIZATION_TITLES);
  const aliases = Object.keys(BUILTIN_ORGANIZATION_ALIASES);

  it("covers every seeded domain exactly once, as a rename or an alias", () => {
    expect([...renamedDomains, ...aliases].sort()).toEqual(
      [...ORGANIZATION_DOMAINS].sort(),
    );
  });

  it("merges each alias into a domain that is itself renamed", () => {
    for (const canonical of Object.values(BUILTIN_ORGANIZATION_ALIASES)) {
      expect(renamedDomains).toContain(canonical);
    }
  });

  it("has unique titles", () => {
    const titles = Object.values(BUILTIN_ORGANIZATION_TITLES);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("has no domain-shaped titles", () => {
    for (const title of Object.values(BUILTIN_ORGANIZATION_TITLES)) {
      expect(title).not.toMatch(/\.(de|org|com|net|berlin|eu|info|io)\b/i);
    }
  });
});

describe("loadOrganizationTitleMap", () => {
  const builtin = {
    titles: BUILTIN_ORGANIZATION_TITLES,
    aliases: BUILTIN_ORGANIZATION_ALIASES,
  };

  function mockFetch(impl: () => Promise<unknown>) {
    vi.spyOn(globalThis, "fetch").mockImplementation(impl as typeof fetch);
    vi.spyOn(console, "warn").mockImplementation(() => {});
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("overrides the built-in map per key with the CDN entries", async () => {
    mockFetch(async () =>
      Response.json({
        titles: { "drk-berlin.de": "DRK Landesverband Berlin" },
        aliases: { "drk.de": "drk-berlin.de" },
      }),
    );

    const map = await loadOrganizationTitleMap("https://cdn.test/x.json");

    expect(map.titles["drk-berlin.de"]).toBe("DRK Landesverband Berlin");
    expect(map.titles["johanniter.de"]).toBe("Johanniter-Unfall-Hilfe");
    expect(map.aliases["drk.de"]).toBe("drk-berlin.de");
    expect(map.aliases["city54hotel.de"]).toBe("city54.de");
  });

  it("falls back to the built-in map on a non-2xx response", async () => {
    mockFetch(async () => new Response("nope", { status: 404 }));

    expect(await loadOrganizationTitleMap("https://cdn.test/x.json")).toEqual(
      builtin,
    );
  });

  it("falls back to the built-in map when the fetch throws", async () => {
    mockFetch(async () => {
      throw new Error("timeout");
    });

    expect(await loadOrganizationTitleMap("https://cdn.test/x.json")).toEqual(
      builtin,
    );
  });

  it("falls back to the built-in map on a malformed body", async () => {
    mockFetch(async () => Response.json({ titles: { "ib.de": "" } }));

    expect(await loadOrganizationTitleMap("https://cdn.test/x.json")).toEqual(
      builtin,
    );
  });
});

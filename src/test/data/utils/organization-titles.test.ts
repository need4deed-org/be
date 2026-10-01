import { afterEach, describe, expect, it, vi } from "vitest";
import { ORGANIZATION_DOMAINS } from "../../../data/migrations/1786109950000-seed-organization-from-agent-domains";
import {
  BUILTIN_ORGANIZATION_TITLES,
  loadOrganizationTitleMap,
  PRIMARY_ORGANIZATION_DOMAINS,
} from "../../../data/utils/organization-titles";

// be#1061: the built-in map has to decide every seeded domain (rename, merge
// or remove), and must never produce a title that still looks like a domain.
describe("built-in organization title map", () => {
  it("covers every seeded domain", () => {
    expect(Object.keys(BUILTIN_ORGANIZATION_TITLES)).toEqual(
      expect.arrayContaining(ORGANIZATION_DOMAINS),
    );
  });

  it("adds operators for domains that were never seeded", () => {
    const unseeded = Object.keys(BUILTIN_ORGANIZATION_TITLES).filter(
      (d) => !ORGANIZATION_DOMAINS.includes(d),
    );
    expect(unseeded).toEqual(["www.berlin.de"]);
  });

  it("has no domain-shaped titles", () => {
    for (const title of Object.values(BUILTIN_ORGANIZATION_TITLES).flat()) {
      // Lowercase only, so a name like "WIR.DE Aktive Nachbarn UG" passes.
      expect(title ?? "").not.toMatch(/\.(de|org|com|net|berlin|eu|info|io)\b/);
    }
  });

  it("only lists primary domains that are kept, one per merged title", () => {
    const primaryTitles = PRIMARY_ORGANIZATION_DOMAINS.map(
      (d) => BUILTIN_ORGANIZATION_TITLES[d],
    );
    expect(primaryTitles).not.toContain(null);
    expect(primaryTitles).not.toContain(undefined);
    expect(new Set(primaryTitles).size).toBe(primaryTitles.length);
  });
});

describe("loadOrganizationTitleMap", () => {
  function mockFetch(impl: () => Promise<unknown>) {
    vi.spyOn(globalThis, "fetch").mockImplementation(impl as typeof fetch);
    vi.spyOn(console, "warn").mockImplementation(() => {});
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("overrides the built-in map per key with the CDN entries", async () => {
    mockFetch(async () =>
      Response.json({ "drk-berlin.de": "DRK Berlin", "ib.de": null }),
    );

    const map = await loadOrganizationTitleMap("https://cdn.test/x.json");

    expect(map["drk-berlin.de"]).toBe("DRK Berlin");
    expect(map["ib.de"]).toBeNull();
    expect(map["johanniter.de"]).toBe("Johanniter-Unfall-Hilfe e.V.");
  });

  it("accepts a list of titles for a domain shared by several operators", async () => {
    mockFetch(async () => Response.json({ "ib.de": ["IB e.V.", "IB GmbH"] }));

    const map = await loadOrganizationTitleMap("https://cdn.test/x.json");

    expect(map["ib.de"]).toEqual(["IB e.V.", "IB GmbH"]);
  });

  it("falls back to the built-in map on a non-2xx response", async () => {
    mockFetch(async () => new Response("nope", { status: 404 }));

    expect(await loadOrganizationTitleMap("https://cdn.test/x.json")).toBe(
      BUILTIN_ORGANIZATION_TITLES,
    );
  });

  it("falls back to the built-in map when the fetch throws", async () => {
    mockFetch(async () => {
      throw new Error("timeout");
    });

    expect(await loadOrganizationTitleMap("https://cdn.test/x.json")).toBe(
      BUILTIN_ORGANIZATION_TITLES,
    );
  });

  it("falls back to the built-in map on a malformed body", async () => {
    mockFetch(async () => Response.json({ "ib.de": "", "jsd.de": [] }));

    expect(await loadOrganizationTitleMap("https://cdn.test/x.json")).toBe(
      BUILTIN_ORGANIZATION_TITLES,
    );
  });
});

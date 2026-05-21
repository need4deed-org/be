import { describe, expect, it } from "vitest";
import { Country, GermanCity } from "../../../data/types";
import { IsPostcodeConstraint } from "../../../services/validators/custom";

function makeArgs(countryCode: Country, allowedAreas?: string[]) {
  return { constraints: [countryCode, allowedAreas] } as any;
}

describe("IsPostcodeConstraint", () => {
  const constraint = new IsPostcodeConstraint();

  describe("Germany without city restriction", () => {
    it("accepts valid German postcodes in the general range", () => {
      expect(constraint.validate("10115", makeArgs(Country.DE))).toBe(true);
      expect(constraint.validate("80331", makeArgs(Country.DE))).toBe(true);
      expect(constraint.validate("99998", makeArgs(Country.DE))).toBe(true);
    });

    it("rejects postcodes outside the German range", () => {
      expect(constraint.validate("00000", makeArgs(Country.DE))).toBe(false);
      expect(constraint.validate("99999", makeArgs(Country.DE))).toBe(false);
    });

    it("rejects non-numeric strings", () => {
      expect(constraint.validate("ABCDE", makeArgs(Country.DE))).toBe(false);
      expect(constraint.validate("", makeArgs(Country.DE))).toBe(false);
    });
  });

  describe("Berlin area restriction", () => {
    it("accepts postcodes within Berlin range", () => {
      expect(
        constraint.validate("10115", makeArgs(Country.DE, [GermanCity.BERLIN])),
      ).toBe(true);
      expect(
        constraint.validate("14199", makeArgs(Country.DE, [GermanCity.BERLIN])),
      ).toBe(true);
    });

    it("rejects postcodes outside Berlin range", () => {
      expect(
        constraint.validate("80331", makeArgs(Country.DE, [GermanCity.BERLIN])),
      ).toBe(false);
      expect(
        constraint.validate("10114", makeArgs(Country.DE, [GermanCity.BERLIN])),
      ).toBe(false);
    });
  });

  describe("Potsdam area restriction", () => {
    it("accepts postcodes within Potsdam range", () => {
      expect(
        constraint.validate(
          "14467",
          makeArgs(Country.DE, [GermanCity.POTSDAM]),
        ),
      ).toBe(true);
      expect(
        constraint.validate(
          "14482",
          makeArgs(Country.DE, [GermanCity.POTSDAM]),
        ),
      ).toBe(true);
    });

    it("rejects postcodes outside Potsdam range", () => {
      expect(
        constraint.validate(
          "10115",
          makeArgs(Country.DE, [GermanCity.POTSDAM]),
        ),
      ).toBe(false);
    });
  });

  describe("multi-city allowed areas", () => {
    it("accepts postcodes valid in any of the listed cities", () => {
      const args = makeArgs(Country.DE, [GermanCity.BERLIN, GermanCity.POTSDAM]);
      expect(constraint.validate("10115", args)).toBe(true);
      expect(constraint.validate("14467", args)).toBe(true);
    });

    it("rejects postcodes valid in neither listed city", () => {
      const args = makeArgs(Country.DE, [GermanCity.BERLIN, GermanCity.POTSDAM]);
      expect(constraint.validate("80331", args)).toBe(false);
    });
  });

  describe("defaultMessage", () => {
    it("returns a message containing the property name", () => {
      const args = { property: "postcode", constraints: [] } as any;
      expect(constraint.defaultMessage(args)).toContain("postcode");
    });
  });

  describe("unsupported country code", () => {
    it("rejects any postcode for a non-DE country code", () => {
      expect(constraint.validate("10115", makeArgs("en" as any))).toBe(false);
    });
  });
});

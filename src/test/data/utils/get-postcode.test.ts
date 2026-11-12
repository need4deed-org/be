import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dataSource } from "../../../data/data-source";
import Postcode from "../../../data/entity/location/postcode.entity";
import {
  getPostcode,
  normalizePostcode,
} from "../../../data/utils/get-postcode";
import { randomNumericSuffix } from "../../random";

describe("normalizePostcode", () => {
  it("restores the leading zero dropped by numeric postal_code", () => {
    expect(normalizePostcode(String(Number("01067")))).toBe("01067");
    expect(normalizePostcode("4109")).toBe("04109");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizePostcode(" 10115 ")).toBe("10115");
    expect(normalizePostcode(" 1067\n")).toBe("01067");
  });

  it("leaves five-digit postcodes unchanged", () => {
    expect(normalizePostcode("10115")).toBe("10115");
    expect(normalizePostcode("01067")).toBe("01067");
  });

  it("does not pad values that are not four digits", () => {
    expect(normalizePostcode("123")).toBe("123");
    expect(normalizePostcode("abcd")).toBe("abcd");
    expect(normalizePostcode("")).toBe("");
  });
});

describe("getPostcode", () => {
  const value = `X${randomNumericSuffix()}`;

  beforeAll(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
  });

  afterAll(async () => {
    await dataSource.getRepository(Postcode).delete({ value });
    await dataSource.destroy();
  });

  it("stores one row when the same new postcode is requested concurrently", async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, () => getPostcode(value)),
    );

    const ids = new Set(results.map((postcode) => postcode?.id));
    expect(ids.size).toBe(1);
    expect(await dataSource.getRepository(Postcode).countBy({ value })).toBe(1);
  });

  it("does not store an invalid postcode when only German ones may be created", async () => {
    const invalid = `Y${randomNumericSuffix()}`;
    expect(await getPostcode(invalid, { createOnlyGerman: true })).toBeNull();
    expect(
      await dataSource.getRepository(Postcode).existsBy({ value: invalid }),
    ).toBe(false);
  });
});

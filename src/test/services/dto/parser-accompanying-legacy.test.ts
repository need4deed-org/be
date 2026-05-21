import { OpportunityLegacyFormData, TranslatedIntoType } from "need4deed-sdk";
import { describe, expect, it, vi } from "vitest";
import { accompanyingParserOpportunity } from "../../../services/dto/parser-accompanying-legacy";

const { mockPostcode, getPostcodeMock } = vi.hoisted(() => {
  const mockPostcode = { id: 1, value: "10115" };
  return {
    mockPostcode,
    getPostcodeMock: vi.fn().mockResolvedValue(mockPostcode),
  };
});

vi.mock("../../../data/utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../data/utils")>()),
  getPostcode: getPostcodeMock,
}));

const baseBody = {
  accomp_address: "Musterstraße 1",
  accomp_name: "Jane Doe",
  accomp_phone: "030123456",
  accomp_datetime: "2026-06-01T10:00:00Z",
  accomp_translation: TranslatedIntoType.DEUTSCHE,
} as unknown as OpportunityLegacyFormData;

describe("accompanyingParserOpportunity", () => {
  it("maps base fields correctly", async () => {
    const result = await accompanyingParserOpportunity(baseBody);

    expect(result.address).toBe("Musterstraße 1");
    expect(result.name).toBe("Jane Doe");
    expect(result.phone).toBe("030123456");
    expect(result.languageToTranslate).toBe(TranslatedIntoType.DEUTSCHE);
    expect(result.date).toBeInstanceOf(Date);
    expect(isNaN(result.date.getTime())).toBe(false);
  });

  it("resolves and assigns postcode entity when accomp_postcode is provided", async () => {
    const body = {
      ...baseBody,
      accomp_postcode: "10115",
    } as unknown as OpportunityLegacyFormData;

    const result = await accompanyingParserOpportunity(body);

    expect(result.postcode).toBe(mockPostcode);
    expect(result.postcode?.value).toBe("10115");
  });

  it("leaves postcode undefined when accomp_postcode is absent", async () => {
    const result = await accompanyingParserOpportunity(baseBody);

    expect(result.postcode).toBeUndefined();
  });
});

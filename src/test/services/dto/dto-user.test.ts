import { describe, expect, it } from "vitest";
import { serializeUserToMeDTO } from "../../../services/dto/dto-user";

describe("serializeUserToMeDTO", () => {
  it("maps all user fields from entity to API shape", () => {
    const user = {
      id: 1,
      email: "test@example.com",
      isActive: true,
      role: "admin",
      language: "de",
      timezone: "Europe/Berlin",
      person: {
        firstName: "Ada",
        name: "Ada Lovelace",
        avatarUrl: "https://cdn.example.com/avatar.png",
      },
    };

    const result = serializeUserToMeDTO(user as any);

    expect(result).toEqual({
      id: 1,
      email: "test@example.com",
      isActive: true,
      role: "admin",
      firstName: "Ada",
      fullName: "Ada Lovelace",
      avatarUrl: "https://cdn.example.com/avatar.png",
      isoCode: "de",
      timezone: "Europe/Berlin",
    });
  });

  it("falls back to empty strings when person fields are missing", () => {
    const user = {
      id: 2,
      email: "no-person@example.com",
      isActive: false,
      role: "coordinator",
      language: null,
      timezone: null,
      person: null,
    };

    const result = serializeUserToMeDTO(user as any);

    expect(result.firstName).toBe("");
    expect(result.fullName).toBe("");
    expect(result.avatarUrl).toBe("");
  });

  it("falls back to default isoCode 'en' and timezone 'CET' when not set", () => {
    const user = {
      id: 3,
      email: "defaults@example.com",
      isActive: true,
      role: "user",
      language: null,
      timezone: null,
      person: { firstName: "Sam", name: "Sam Smith", avatarUrl: "" },
    };

    const result = serializeUserToMeDTO(user as any);
    expect(result.isoCode).toBe("en");
    expect(result.timezone).toBe("CET");
  });
});

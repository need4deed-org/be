import { EntityTableName } from "need4deed-sdk";
import { describe, expect, it } from "vitest";
import {
  getTranslatedEntity,
  getTranslationFkColumn,
  isTranslatedEntityType,
  translatedEntities,
} from "../../../services/translation/registry";

describe("translatedEntities", () => {
  const entries = Object.values(translatedEntities);

  it("gives every table its own FK property", () => {
    const fks = entries.map(({ fk }) => fk);
    expect(new Set(fks).size).toBe(fks.length);
  });

  it("never reuses language_id, which is the target language", () => {
    expect(entries.map(({ fk }) => fk)).not.toContain("languageId");
  });

  it("lists at least one field per table", () => {
    for (const { fields } of entries) {
      expect(fields.length).toBeGreaterThan(0);
    }
  });

  it("only sends opportunity text to machine translation", () => {
    const machine = Object.entries(translatedEntities)
      .filter(([, { machine }]) => machine)
      .map(([entityType]) => entityType);
    expect(machine).toEqual([EntityTableName.OPPORTUNITY]);
  });
});

describe("getTranslatedEntity", () => {
  it("returns the entry for a translated table", () => {
    expect(getTranslatedEntity(EntityTableName.SKILL).fk).toBe("skillId");
  });

  it("throws for a table without translations", () => {
    expect(isTranslatedEntityType(EntityTableName.VOLUNTEER)).toBe(false);
    expect(() => getTranslatedEntity(EntityTableName.VOLUNTEER)).toThrow(
      /No field_translation FK/,
    );
  });
});

describe("getTranslationFkColumn", () => {
  it("snake-cases the FK property into its column name", () => {
    expect(getTranslationFkColumn(EntityTableName.AGENT_TYPE)).toBe(
      "agent_type_id",
    );
    expect(getTranslationFkColumn(EntityTableName.LANGUAGE)).toBe(
      "translated_language_id",
    );
  });
});

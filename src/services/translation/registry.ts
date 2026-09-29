import { EntityTableName } from "need4deed-sdk";
import type FieldTranslation from "../../data/entity/field_translation.entity";
import LeadFrom from "../../data/entity/lead.entity";
import Opportunity from "../../data/entity/opportunity/opportunity.entity";
import Activity from "../../data/entity/profile/activity.entity";
import AgentType from "../../data/entity/profile/agent-type.entity";
import Category from "../../data/entity/profile/category.entity";
import Language from "../../data/entity/profile/language.entity";
import Service from "../../data/entity/profile/service.entity";
import Skill from "../../data/entity/profile/skill.entity";
import { pascal2snake } from "../utils";

interface TranslatedEntity {
  // FieldTranslation property holding the FK to this table (be#1066 replaced
  // the polymorphic entity_type/entity_id pair with one nullable FK per table).
  fk: keyof FieldTranslation;
  entity: new () => { id: number };
  // field_name values a translation row of this table may carry.
  fields: readonly string[];
  // true: user-entered text, translated by the MT worker (be#1067).
  // false: seeded reference data (origin = reference), never sent to MT.
  machine: boolean;
}

// Every table that can have field_translation rows, keyed by the
// EntityTableName the rest of the code already uses to name it. Adding a
// table here also needs a migration: its FK column, its partial unique index,
// and the field_translation_one_target CHECK.
export const translatedEntities = {
  [EntityTableName.OPPORTUNITY]: {
    fk: "opportunityId",
    entity: Opportunity,
    fields: ["title", "info"],
    machine: true,
  },
  [EntityTableName.LANGUAGE]: {
    fk: "translatedLanguageId",
    entity: Language,
    fields: ["title"],
    machine: false,
  },
  [EntityTableName.CATEGORY]: {
    fk: "categoryId",
    entity: Category,
    fields: ["title", "description"],
    machine: false,
  },
  [EntityTableName.ACTIVITY]: {
    fk: "activityId",
    entity: Activity,
    fields: ["title"],
    machine: false,
  },
  [EntityTableName.SKILL]: {
    fk: "skillId",
    entity: Skill,
    fields: ["title"],
    machine: false,
  },
  [EntityTableName.AGENT_TYPE]: {
    fk: "agentTypeId",
    entity: AgentType,
    fields: ["title"],
    machine: false,
  },
  [EntityTableName.SERVICE]: {
    fk: "serviceId",
    entity: Service,
    fields: ["title"],
    machine: false,
  },
  [EntityTableName.LEAD]: {
    fk: "leadFromId",
    entity: LeadFrom,
    fields: ["title"],
    machine: false,
  },
} as const satisfies Partial<Record<EntityTableName, TranslatedEntity>>;

export type TranslatedEntityType = keyof typeof translatedEntities;
export type TranslationFk =
  (typeof translatedEntities)[TranslatedEntityType]["fk"];

export function isTranslatedEntityType(
  entityType: EntityTableName,
): entityType is TranslatedEntityType {
  return entityType in translatedEntities;
}

export function getTranslatedEntity(entityType: EntityTableName) {
  if (!isTranslatedEntityType(entityType)) {
    throw new Error(`No field_translation FK for entity type ${entityType}`);
  }
  return translatedEntities[entityType];
}

export function getTranslationFkColumn(entityType: EntityTableName): string {
  return pascal2snake(getTranslatedEntity(entityType).fk, "lower");
}

// Only machine-translated tables and their listed fields are accepted: PII
// fields (e.g. infoConfidential) and reference tables never reach the queue.
export function getMachineEntry(
  entityType: EntityTableName,
  fieldNames: string[],
) {
  const entry = getTranslatedEntity(entityType);
  if (!entry.machine) {
    throw new Error(`${entityType} is not machine-translated`);
  }
  const allowed: readonly string[] = entry.fields;
  const rejected = fieldNames.filter((field) => !allowed.includes(field));
  if (rejected.length > 0) {
    throw new Error(
      `${entityType} fields not machine-translated: ${rejected.join(", ")}`,
    );
  }
  return entry;
}

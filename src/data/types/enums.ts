import { Lang } from "need4deed-sdk";

export enum Role {
  USER = "user",
  ADMIN = "admin",
}

export { Lang as Country };

// this will go to sdk
export enum GermanCity {
  BERLIN = "Berlin",
  POTSDAM = "Potsdam",
}

export enum LocationType {
  POSTCODE = "postcode",
  DISTRICT = "district",
  ADDRESS = "address",
  GEOLOCATION = "geolocation",
}

export enum DealType {
  VOLUNTEER = "volunteer",
  OPPORTUNITY = "opportunity",
}

export enum OpportunityType {
  VOLUNTEERING = "volunteering",
  ACCOMPANYING = "accompanying",
}

export enum AgentOperatorType {
  ORGANIZATION = "organization",
  PERSON = "person",
}

export enum AgentType {
  RAC = "RAC",
}

export enum TranslationEntityType {
  ACTIVITY = "ACTIVITY",
  SKILL = "SKILL",
  CATEGORY = "CATEGORY",
  LANGUAGE = "LANGUAGE",
}

export enum DocumentStatusType {
  UNDEFINED = "undefined",
  YES = "yes",
  NO = "no",
  ASKED_TO_APPLY = "asked_to_apply",
  APPLIED_SELF = "applied_self",
  APPLIED_N4D = "applied_n4d",
}

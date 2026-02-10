import { Lang } from "need4deed-sdk";

export enum Role {
  USER = "user",
  COORDINATOR = "coordinator",
  AGENT = "agent",
  VOLUNTEER = "volunteer",
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

export enum AgentOperatorType {
  ORGANIZATION = "organization",
  PERSON = "person",
}

export enum AgentType {
  RAC = "RAC",
  NGO = "NGO",
}

export enum ConfigType {
  SCHEMA = "schema",
  REFERENCE_DATA = "reference_data",
  MASTER_DATA = "master_data",
  TRUNCATE_ALL = "truncate-all",
}

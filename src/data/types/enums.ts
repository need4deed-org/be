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

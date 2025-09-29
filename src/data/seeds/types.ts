import {
  DealType,
  DocumentStatusType,
  LangProficiency,
  OpportunityType,
  VolunteerStateType,
} from "need4deed-sdk";

export interface ProfileJSON {
  info: string;
  activities: string[];
  skills: string[];
  languages: [string, LangProficiency][];
}
export interface TimeJSON {
  timeslots: {
    day: string;
    daytime: string[];
    info: string;
    start: string;
  }[];
}
export interface LocationJSON {
  districts: string[];
}
export interface DealJSON {
  type: DealType;
  postcode: string;
  profile: ProfileJSON;
  time: TimeJSON;
  location: LocationJSON;
}
export interface AddressJSON {
  postcode: number;
  street?: string;
}
export interface PersonJSON {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  address: AddressJSON;
}
export interface OrganizationJSON {
  title: string;
  phone: string;
  email: string;
  address: AddressJSON;
  person: PersonJSON;
}
export interface AgentJSON {
  title: string;
  organization: OrganizationJSON;
  person: PersonJSON;
  postcode: string;
}
export interface VolunteerJSON {
  status: VolunteerStateType;
  statusCGC: DocumentStatusType;
  statusVaccination: DocumentStatusType;
  infoAbout: string;
  infoExperience: string;
  person: PersonJSON;
  deal: DealJSON;
}
export interface OpportunityJSON {
  status: string;
  title: string;
  type: OpportunityType;
  translationType: string;
  info: string;
  infoConfidential: string;
  deal: DealJSON;
  agent: AgentJSON;
}

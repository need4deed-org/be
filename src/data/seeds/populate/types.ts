import {
  DocumentStatusType,
  EventN4DType,
  LangProficiency,
  OpportunityType,
  VolunteerStateType,
} from "need4deed-sdk";
import { DealType } from "../../types";

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
export interface _AgentJSON {
  title: string;
  page_id: string;
  organization: OrganizationJSON;
  person: PersonJSON;
  postcode: string;
}
export interface VolunteerJSON {
  nid: string;
  timestamp: string;
  status: VolunteerStateType;
  statusEngagement: string;
  accompanying: boolean;
  statusCGC: DocumentStatusType;
  statusVaccination: DocumentStatusType;
  infoAbout: string;
  infoExperience: string;
  person: PersonJSON;
  deal: DealJSON;
}
export interface AccompanyingJSON {
  address: string;
  name: string;
  phone: string;
  date: string;
  languageToTranslate: string;
}
export interface OpportunityJSON {
  status: string;
  title: string;
  nid: string;
  timestamp: string;
  type: OpportunityType;
  translationType: string;
  info: string;
  numberVolunteers: string;
  infoConfidential: string;
  deal: DealJSON;
  agent: _AgentJSON;
  accompanying?: AccompanyingJSON;
  volunteerNids: string[];
}
export interface AgentJSON {
  nid: string;
  title: string;
  about: string;
  website: string;
  type: string;
  district: object;
  trustLevel: string;
  statusEngagement: string;
  statusSearch: string;
  languages: string;
  services: string[];
  address: object;
  postcodes: string[];
  phone: string;
  status: string;
  person: (PersonJSON & { role: string; status?: string })[];
  operator: string;
  opportunityNids: string[];
  accompanyingRelations: string[];
  unclaimed?: boolean;
}
export interface EventTranslationJSON {
  isoCode: string;
  title: string;
  subtitle?: string;
  menuTitle: string;
  timeStr?: string;
  locationComment?: string;
  description: string;
  shortDescription: string;
  additionalTitle?: string;
  additionalInfo?: string[];
  outro?: string;
  followupText?: string;
}
export interface EventJSON {
  nid: string;
  isActive: boolean;
  date: string;
  dateEnd?: string;
  type: EventN4DType;
  pic?: string;
  locationLink?: string;
  rsvpLink: string;
  followupLink?: string;
  address: string;
  hostName?: string;
  translations: EventTranslationJSON[];
}

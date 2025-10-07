export * from "./person.schema";
export * from "./responseErrors";
export * from "./user.schema";

import volunteerSchemaJson from "./volunteer-api.json";
export const volunteerResponseSchema =
  volunteerSchemaJson.definitions.ApiVolunteerGetList;

import volunteerIdSchemaJson from "./volunteer-api-id.json";
export const volunteerIdResponseSchema =
  volunteerIdSchemaJson.definitions.ApiVolunteerGet;

import volunteerIdPatchSchemaJson from "./volunteer-api-id-part.json";
export const volunteerIdPatchBodySchema =
  volunteerIdPatchSchemaJson.definitions.ApiVolunteerBodyPart;

import volunteerFormSchemaJson from "./volunteer-form.json";
export const volunteerFormSchema = volunteerFormSchemaJson;

import optionListsSchemaJson from "./option-lists.json";
export const optionListsSchema = optionListsSchemaJson.definitions.OptionLists;

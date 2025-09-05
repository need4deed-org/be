export * from "./person.schema";
export * from "./responseErrors";
export * from "./user.schema";

import volunteerSchemaJson from "./volunteer-api.json";
export const volunteerResponseSchema =
  volunteerSchemaJson.definitions.ApiVolunteerGetList;

export * from "./person.schema";
export * from "./responseErrors";
export * from "./user.schema";

import volunteerApi from "./volunteer-api.json";
export const volunteerResponseSchema = volunteerApi.definitions.VolunteerAPI;

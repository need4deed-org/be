import { responseSchema } from "./response-schema";

// Body for POST /event-registration (SDK ApiOpportunityEventRegistrationPost).
export const opportunityEventRegistrationBodySchema = {
  type: "object",
  required: ["opportunityId", "fullName", "email"],
  additionalProperties: false,
  properties: {
    opportunityId: { type: "integer" },
    fullName: { type: "string", minLength: 1 },
    email: { type: "string", minLength: 1 },
    phone: { type: ["string", "null"] },
    numberOfPeople: { type: "integer", minimum: 1, default: 1 },
    languagePreference: { type: ["string", "null"] },
    message: { type: ["string", "null"], maxLength: 500 },
  },
};

export const opportunityEventRegistrationResponseSchema = responseSchema({
  statusCode: 201,
});

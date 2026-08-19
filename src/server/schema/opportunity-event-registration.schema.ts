import { responseSchema } from "./response-schema";
import { responseErrors } from "./responseErrors";

// Body for POST /event-registration (SDK ApiOpportunityEventRegistrationPost).
export const opportunityEventRegistrationBodySchema = {
  type: "object",
  required: ["opportunityId", "fullName", "email", "numberOfPeople"],
  additionalProperties: false,
  properties: {
    opportunityId: { type: "integer" },
    fullName: { type: "string", minLength: 1 },
    email: { type: "string", minLength: 1, format: "email" },
    phone: { type: ["string", "null"] },
    numberOfPeople: { type: "integer", minimum: 1, maximum: 1000 },
    languagePreference: { type: ["string", "null"] },
    message: { type: ["string", "null"], maxLength: 500 },
  },
};

export const opportunityEventRegistrationResponseSchema = responseSchema({
  statusCode: 201,
});

// Item shape for GET /opportunity/:id/registrations (SDK
// ApiOpportunityEventRegistrationGet). Inline, not $ref'd — not yet part of
// the generated sdk-types.json bundle.
const opportunityEventRegistrationItemSchema = {
  type: "object",
  properties: {
    id: { type: "integer" },
    fullName: { type: "string" },
    email: { type: "string" },
    phone: { type: ["string", "null"] },
    numberOfPeople: { type: "integer" },
    languagePreference: { type: ["string", "null"] },
    message: { type: ["string", "null"] },
    createdAt: { type: "string" },
  },
};

export const opportunityEventRegistrationListResponseSchema = {
  200: {
    type: "object",
    required: ["message", "data", "count", "totalPeople"],
    properties: {
      message: { type: "string" },
      data: { type: "array", items: opportunityEventRegistrationItemSchema },
      count: { type: "integer" },
      totalPeople: { type: "integer" },
    },
    additionalProperties: false,
  },
  ...responseErrors,
};

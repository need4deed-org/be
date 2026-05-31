// Request body for POST /agent/register (public self-registration).
//
// Captures user/person credentials + agent profile in one payload; the
// handler persists all four (Person, User, Agent, AgentPerson) inside a
// single transaction. Address fields are best-effort — postcode must exist
// in the Postcode table or the address is silently omitted (matches
// createAddress in for-routes.ts).
export const registerAgentBodySchema = {
  type: "object",
  required: ["email", "password", "person", "agent"],
  additionalProperties: false,
  properties: {
    email: { type: "string", format: "email" },
    password: { type: "string", minLength: 8, maxLength: 50 },
    language: { type: "string", default: "en", pattern: "^[a-z]{2}$" },
    timezone: { type: "string", default: "CET" },
    person: {
      type: "object",
      required: ["firstName", "lastName"],
      additionalProperties: false,
      properties: {
        firstName: { type: "string", minLength: 1 },
        lastName: { type: "string", minLength: 1 },
        phone: { type: "string", minLength: 7, maxLength: 20 },
      },
    },
    agent: {
      type: "object",
      required: ["title"],
      additionalProperties: false,
      properties: {
        title: { type: "string", minLength: 1 },
        type: { $ref: "AgentType#" },
        info: { type: "string" },
        website: { type: "string" },
        services: {
          type: "array",
          items: { $ref: "AgentServiceType#" },
        },
        addressStreet: { type: "string" },
        addressPostcode: { type: "string" },
        districtId: { type: "integer" },
        languages: {
          type: "array",
          items: { type: "integer" },
        },
      },
    },
  },
};

export const registerAgentResponseSchema = {
  type: "object",
  properties: {
    message: { type: "string" },
    data: {
      type: "object",
      properties: {
        userId: { type: "integer" },
        agentId: { type: "integer" },
      },
      required: ["userId", "agentId"],
    },
  },
  required: ["message", "data"],
};

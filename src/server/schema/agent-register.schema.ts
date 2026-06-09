// Schemas for POST /agent/register?token=<verify-jwt>.
//
// The user + person already exist (created via POST /user + email verification).
// Authorization is the verify token carried in the querystring (see the route's
// preHandler); the body only describes the agent action: JOIN an existing agent
// by id, or CREATE a new one.
//
// NOTE: the create field names (`info`, `languages: number[]`) follow the
// registration write contract (SDK ApiAgentRegisterNew) and intentionally
// differ from the agent PATCH shape (`about`, `languages: OptionById[]`).

export const registerAgentQuerySchema = {
  type: "object",
  required: ["token"],
  additionalProperties: false,
  properties: {
    token: { type: "string", minLength: 1 },
  },
};

const registerAgentNewSchema = {
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
};

export const registerAgentBodySchema = {
  oneOf: [
    {
      type: "object",
      required: ["agentId"],
      additionalProperties: false,
      properties: {
        agentId: { type: "integer" },
      },
    },
    {
      type: "object",
      required: ["agent"],
      additionalProperties: false,
      properties: {
        agent: registerAgentNewSchema,
      },
    },
  ],
};

export const registerAgentResponseSchema = {
  type: "object",
  required: ["message", "data"],
  properties: {
    message: { type: "string" },
    data: {
      type: "object",
      required: ["agentId", "membershipStatus"],
      properties: {
        agentId: { type: "integer" },
        membershipStatus: { type: "string", enum: ["active", "pending"] },
      },
    },
  },
};

// 409 on CREATE when the title is taken — carries the existing agent id so the
// client can offer to JOIN instead. Overrides the generic 409 in responseErrors.
export const registerAgentConflictSchema = {
  type: "object",
  required: ["message", "conflict"],
  properties: {
    message: { type: "string" },
    conflict: { type: "string", enum: ["title"] },
    agentId: { type: "integer" },
  },
};

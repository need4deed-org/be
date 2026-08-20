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

// GET /agent/register/search?token=&street= — picker lookup during registration.
export const registerSearchQuerySchema = {
  type: "object",
  required: ["token"],
  additionalProperties: false,
  properties: {
    token: { type: "string", minLength: 1 },
    street: { type: "string" },
  },
};

export const registerSearchResponseSchema = {
  type: "object",
  required: ["message", "data"],
  properties: {
    message: { type: "string" },
    data: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "title"],
        additionalProperties: false,
        properties: {
          id: { type: "integer" },
          title: { type: "string" },
        },
      },
    },
  },
};

// Fields shared by both create flows: self-registration's CREATE branch
// (which also collects `phone`, written onto the registrant's own Person)
// and the coordinator/admin bare-create below (which has no Person to
// attach a phone to).
const agentCreateBaseSchema = {
  type: "object",
  required: ["title"],
  additionalProperties: false,
  properties: {
    title: { type: "string", minLength: 1 },
    typeId: { type: "integer" },
    info: { type: "string" },
    website: { type: "string" },
    serviceIds: {
      type: "array",
      items: { type: "integer" },
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

export const registerAgentNewSchema = {
  ...agentCreateBaseSchema,
  properties: {
    ...agentCreateBaseSchema.properties,
    phone: { type: "string" },
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

// 409 on CREATE when the title is taken (`title`) or the street+postcode
// already resolve to an existing agent (`address`) — carries that agent's id so
// the client can offer to JOIN instead. Overrides the generic 409.
export const registerAgentConflictSchema = {
  type: "object",
  required: ["message", "conflict"],
  properties: {
    message: { type: "string" },
    conflict: { type: "string", enum: ["title", "address"] },
    agentId: { type: "integer" },
  },
};

// POST /agent (coordinator/admin-only, fe#911) — same create fields as
// registration's CREATE branch, minus `phone` (a bare agent has no linked
// Person to attach it to — see createBareAgent). The body isn't wrapped in
// { agent: ... } since this endpoint only ever creates, never joins.
export const createAgentBodySchema = agentCreateBaseSchema;

export const createAgentResponseSchema = {
  type: "object",
  required: ["message", "data"],
  properties: {
    message: { type: "string" },
    data: {
      type: "object",
      required: ["agentId"],
      properties: {
        agentId: { type: "integer" },
      },
    },
  },
};

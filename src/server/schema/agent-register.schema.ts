export const registerAgentQuerySchema = {
  type: "object",
  required: ["token"],
  additionalProperties: false,
  properties: {
    token: { type: "string", minLength: 1 },
  },
};

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
        required: ["id"],
        additionalProperties: false,
        properties: {
          id: { type: "integer", minimum: 1 },
          title: { type: "string" },
        },
      },
    },
  },
};

const agentCreateBaseSchema = {
  type: "object",
  required: ["title"],
  additionalProperties: false,
  properties: {
    title: { type: "string", minLength: 1 },
    typeId: { type: "integer", minimum: 1 },
    info: { type: "string" },
    website: { type: "string" },
    serviceIds: {
      type: "array",
      items: { type: "integer", minimum: 1 },
    },
    addressStreet: { type: "string" },
    addressPostcode: { type: "string" },
    languages: {
      type: "array",
      items: { type: "integer", minimum: 1 },
    },
    confirmSharedAddress: { type: "boolean" },
    organizationId: { type: "integer", minimum: 1 },
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
        agentId: { type: "integer", minimum: 1 },
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
        agentId: { type: "integer", minimum: 1 },
        membershipStatus: { type: "string", enum: ["active", "pending"] },
      },
    },
  },
};

const conflictBase = {
  message: { type: "string" },
  agentId: { type: "integer", minimum: 1 },
};

export const registerAgentConflictSchema = {
  anyOf: [
    {
      type: "object",
      required: ["message", "conflict"],
      properties: { ...conflictBase, conflict: { const: "title" } },
    },
    {
      type: "object",
      required: ["message", "conflict", "agentId"],
      properties: {
        ...conflictBase,
        conflict: { const: "address" },
        agentTitle: { type: "string" },
      },
    },
    {
      type: "object",
      required: ["message", "conflict", "agentId", "membershipStatus"],
      properties: {
        ...conflictBase,
        conflict: { const: "registered" },
        membershipStatus: { type: "string", enum: ["active", "pending"] },
      },
    },
  ],
};

export const registerAgentStatusResponseSchema = {
  type: "object",
  required: ["message", "data"],
  properties: {
    message: { type: "string" },
    data: {
      type: "object",
      required: ["registered"],
      additionalProperties: false,
      properties: {
        registered: { type: "boolean" },
        agentId: { type: "integer", minimum: 1 },
        agentTitle: { type: "string" },
        membershipStatus: { type: "string", enum: ["active", "pending"] },
      },
    },
  },
};

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
        agentId: { type: "integer", minimum: 1 },
      },
    },
  },
};

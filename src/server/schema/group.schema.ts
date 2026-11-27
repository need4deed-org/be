const groupCountsSchema = {
  type: "object",
  required: ["volunteers", "opportunities", "accounts"],
  additionalProperties: false,
  properties: {
    volunteers: { type: "integer", minimum: 0 },
    opportunities: { type: "integer", minimum: 0 },
    accounts: { type: "integer", minimum: 0 },
  },
};

const groupItemSchema = {
  type: "object",
  required: [
    "id",
    "title",
    "organizationId",
    "organizationTitle",
    "agentId",
    "agentTitle",
    "counts",
    "createdAt",
  ],
  additionalProperties: false,
  properties: {
    id: { type: "integer", minimum: 1 },
    title: { type: "string" },
    organizationId: { type: ["integer", "null"] },
    organizationTitle: { type: ["string", "null"] },
    agentId: { type: ["integer", "null"] },
    agentTitle: { type: ["string", "null"] },
    counts: groupCountsSchema,
    createdAt: { type: "string", format: "date-time" },
  },
};

export const groupListResponseSchema = {
  type: "object",
  required: ["message", "data"],
  properties: {
    message: { type: "string" },
    data: { type: "array", items: groupItemSchema },
  },
};

export const groupItemResponseSchema = {
  type: "object",
  required: ["message", "data"],
  properties: {
    message: { type: "string" },
    data: groupItemSchema,
  },
};

export const groupPostBodySchema = {
  type: "object",
  required: ["title"],
  additionalProperties: false,
  properties: {
    title: { type: "string", minLength: 1, maxLength: 255 },
    organizationId: { type: "integer", minimum: 1 },
    agentId: { type: "integer", minimum: 1 },
  },
  oneOf: [
    {
      required: ["organizationId"],
      not: { required: ["agentId"] },
    },
    {
      required: ["agentId"],
      not: { required: ["organizationId"] },
    },
  ],
};

export const groupPatchBodySchema = {
  type: "object",
  required: ["title"],
  additionalProperties: false,
  properties: {
    title: { type: "string", minLength: 1, maxLength: 255 },
    organizationId: { not: {} },
    agentId: { not: {} },
  },
};

export const groupDeleteResponseSchema = {
  type: "object",
  required: ["message", "data"],
  properties: {
    message: { type: "string" },
    data: {
      type: "object",
      required: ["id", "counts", "erasedPersons"],
      additionalProperties: false,
      properties: {
        id: { type: "integer", minimum: 1 },
        counts: groupCountsSchema,
        erasedPersons: { type: "integer", minimum: 0 },
      },
    },
  },
};

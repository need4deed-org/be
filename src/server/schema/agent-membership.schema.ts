export const membershipListQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: { type: "string", enum: ["active", "pending"] },
  },
};

export const membershipListResponseSchema = {
  type: "object",
  required: ["message", "data"],
  properties: {
    message: { type: "string" },
    data: {
      type: "array",
      items: { type: "object", additionalProperties: true },
    },
  },
};

export const membershipPatchBodySchema = {
  type: "object",
  required: ["status"],
  additionalProperties: false,
  properties: {
    status: { type: "string", enum: ["active", "pending"] },
  },
};

export const membershipMessageResponseSchema = {
  type: "object",
  required: ["message"],
  properties: {
    message: { type: "string" },
  },
};

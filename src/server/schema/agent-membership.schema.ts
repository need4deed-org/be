// Schemas for the agent membership moderation endpoints
// (GET/PATCH/DELETE /agent/membership). Guarded by the agent routes'
// COORDINATOR onRequest hook (ADMIN bypasses) — the admin fallback for joins
// that did not pass domain-match (status PENDING).

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
    // ApiAgentMembership[] — left open (additionalProperties) so the nested
    // person/address payload is not stripped during serialization.
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

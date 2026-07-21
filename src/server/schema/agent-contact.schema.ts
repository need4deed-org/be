// Schema for POST /agent/:id/contact — adding an additional contact (Person +
// AgentPerson) to an existing agent from that agent's own profile. Distinct
// from POST /agent/register (agent-register.schema.ts), which always links
// the authenticated caller's own person.

export const agentContactPostBodySchema = {
  type: "object",
  required: ["firstName", "lastName", "role"],
  additionalProperties: false,
  properties: {
    firstName: { type: "string", minLength: 1 },
    lastName: { type: "string", minLength: 1 },
    role: { $ref: "AgentRoleType#" },
    email: { type: "string" },
    phone: { type: "string" },
    addressStreet: { type: "string" },
    addressPostcode: { type: "string" },
  },
};

// ApiAgentMembership — left open (additionalProperties) so the nested
// person/address payload is not stripped during serialization, mirroring
// membershipListResponseSchema (agent-membership.schema.ts).
export const agentContactResponseSchema = {
  type: "object",
  required: ["message", "data"],
  properties: {
    message: { type: "string" },
    data: { type: "object", additionalProperties: true },
  },
};

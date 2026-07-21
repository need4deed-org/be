// Schema for POST /agent/:id/contact and PATCH /agent/:id/contact/:membershipId
// — adding or updating a contact (Person + AgentPerson) on an existing agent
// from that agent's own profile. Distinct from POST /agent/register
// (agent-register.schema.ts), which always links the authenticated caller's
// own person, and from PATCH /person/:id, which is strictly self-only.

export const agentContactMembershipParamSchema = {
  type: "object",
  properties: {
    id: { type: "integer", minimum: 1 },
    membershipId: { type: "integer", minimum: 1 },
  },
  required: ["id", "membershipId"],
};

export const agentContactPostBodySchema = {
  type: "object",
  required: ["firstName", "lastName", "role"],
  additionalProperties: false,
  properties: {
    firstName: { type: "string", minLength: 1 },
    middleName: { type: "string" },
    lastName: { type: "string", minLength: 1 },
    role: { $ref: "AgentRoleType#" },
    email: { type: "string" },
    phone: { type: "string" },
    landline: { type: "string" },
    addressStreet: { type: "string" },
    addressPostcode: { type: "string" },
  },
};

// Every field optional — a partial update of an existing contact.
export const agentContactPatchBodySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    firstName: { type: "string", minLength: 1 },
    middleName: { type: "string" },
    lastName: { type: "string", minLength: 1 },
    role: { $ref: "AgentRoleType#" },
    email: { type: "string" },
    phone: { type: "string" },
    landline: { type: "string" },
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

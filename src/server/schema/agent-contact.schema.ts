export const agentContactMembershipParamSchema = {
  type: "object",
  properties: {
    id: { type: "integer", minimum: 1 },
    membershipId: { type: "integer", minimum: 1 },
  },
  required: ["id", "membershipId"],
};

const nullableString = { anyOf: [{ const: null }, { type: "string" }] };

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

export const agentContactPatchBodySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    firstName: { type: "string", minLength: 1 },
    middleName: nullableString,
    lastName: { type: "string", minLength: 1 },
    role: { $ref: "AgentRoleType#" },
    email: nullableString,
    phone: nullableString,
    landline: nullableString,
    addressStreet: nullableString,
    addressPostcode: nullableString,
  },
};

export const agentContactResponseSchema = {
  type: "object",
  required: ["message", "data"],
  properties: {
    message: { type: "string" },
    data: { type: "object", additionalProperties: true },
  },
};

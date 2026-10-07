export const existingPersonSchema = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "number", minimum: 1 },
    firstName: { type: "string", readOnly: true },
    lastName: { type: "string", readOnly: true },
    email: { type: "string", readOnly: true },
    phone: { type: "string", readOnly: true },
    address: { type: "string", readOnly: true },
  },
  additionalProperties: true,
};

export const newPersonSchema = {
  type: "object",
  required: ["firstName", "lastName"],
  properties: {
    firstName: { type: "string", minLength: 1 },
    middleName: { type: ["string", "null"] },
    lastName: { type: "string", minLength: 1 },
    email: { type: ["string", "null"], format: "email" },
    phone: { type: ["string", "null"], minLength: 7, maxLength: 20 },
    address: { type: ["string", "null"] },
  },
  additionalProperties: false,
};

export const personResponseSchema = {
  type: "object",
  properties: {
    id: { type: "number", minimum: 1 },
    firstName: { type: "string" },
    lastName: { type: "string" },
    middleName: { type: ["string", "null"] },
    email: { type: ["string", "null"] },
    phone: { type: ["string", "null"] },
    address: { type: ["string", "null"] },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
  required: ["id", "firstName", "lastName", "createdAt", "updatedAt"],
  additionalProperties: false,
};

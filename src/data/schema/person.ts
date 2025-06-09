// Schema for an existing person (only ID is strictly required for linking)
export const existingPersonSchema = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "number", minimum: 1 },
    firstName: { type: "string", readOnly: true }, // Indicate these are not for creation/update
    lastName: { type: "string", readOnly: true },
    email: { type: "string", readOnly: true },
    phone: { type: "string", readOnly: true },
    address: { type: "string", readOnly: true },
  },
  additionalProperties: true, // Allow other properties but they will be ignored by preHandler
};

// Schema for creating a new person (firstName and lastName are mandatory)
export const newPersonSchema = {
  type: "object",
  required: ["firstName", "lastName"],
  properties: {
    firstName: { type: "string", minLength: 1 },
    middleName: { type: ["string", "null"] },
    lastName: { type: "string", minLength: 1 },
    email: { type: ["string", "null"], format: "email" }, // Basic email format check
    phone: { type: ["string", "null"], minLength: 7, maxLength: 20 },
    address: { type: ["string", "null"] },
  },
  additionalProperties: false, // Disallow extra properties for new person creation
};

export const personResponseSchema = {
  type: "object",
  properties: {
    id: { type: "number" },
    firstName: { type: "string" },
    lastName: { type: "string" },
    middleName: { type: ["string", "null"] },
    email: { type: ["string", "null"] },
    phone: { type: ["string", "null"] },
    address: { type: ["string", "null"] },
    createdAt: { type: "string", format: "date-time" }, // Assuming ISO 8601 string
    updatedAt: { type: "string", format: "date-time" },
  },
  required: ["id", "firstName", "lastName", "createdAt", "updatedAt"], // Adjust required based on your entity
  additionalProperties: false, // Disallow extra properties in the response
};

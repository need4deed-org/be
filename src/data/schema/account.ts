import { existingPersonSchema, newPersonSchema } from "./person";

export const createAccountBodySchema = {
  type: "object",
  required: ["email", "person"], // 'person' is now a required nested object
  properties: {
    email: { type: "string", format: "email" },
    password: { type: ["string", "null"], minLength: 8, maxLength: 50 },
    isActive: { type: "boolean", default: false },
    role: { type: "string", default: "user", enum: ["user", "admin"] }, // Example roles
    language: { type: "string", default: "en", pattern: "^[a-z]{2}$" }, // e.g., 'en', 'es'
    timezone: { type: "string", default: "CET" },
    person: {
      oneOf: [
        // The 'person' property must match one of these schemas
        existingPersonSchema,
        newPersonSchema,
      ],
    },
  },
  additionalProperties: false,
};

export const accountResponseSchema = {
  type: "object",
  properties: {
    id: { type: "number" },
    email: { type: "string" },
    isActive: { type: "boolean" },
    role: { type: "string" },
    language: { type: "string" },
    timezone: { type: "string" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
    person: {
      type: "object",
      properties: {
        id: { type: "number" },
        firstName: { type: "string" },
        middleName: { type: ["string", "null"] },
        lastName: { type: "string" },
        email: { type: ["string", "null"], format: "email" },
        phone: { type: ["string", "null"] },
        address: { type: ["string", "null"] },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
      },
      required: ["id", "firstName", "lastName"],
    },
  },
  required: [
    "id",
    "email",
    "isActive",
    "role",
    "language",
    "timezone",
    "createdAt",
    "updatedAt",
    "person",
  ],
};

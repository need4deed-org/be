import { existingPersonSchema, newPersonSchema } from "./person.schema";

// Matches the SDK ApiUserPost contract: email, password, role (UserRole),
// optional language (Lang, defaults to "en"), person. (isActive is
// server-controlled; timezone uses the entity default.)
export const createUserBodySchema = {
  type: "object",
  required: ["email", "password", "role", "person"],
  properties: {
    email: { type: "string", format: "email" },
    password: { type: "string", minLength: 8, maxLength: 50 },
    role: { $ref: "UserRole#" },
    // Optional: defaults to "en" when omitted (allOf keeps the Lang enum while
    // allowing a sibling default, which a bare $ref would ignore in draft-07).
    language: { allOf: [{ $ref: "Lang#" }], default: "en" },
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

export const refreshAccessSchema = {
  type: ["object", "null"],
  properties: {
    refresh: { type: "string" },
  },
};

export const refreshAccessResponseSchema = {
  type: "object",
  properties: {
    access: { type: "string" },
  },
  required: ["access"],
};

export const userLoginSchema = {
  type: "object",
  properties: {
    email: { type: "string" },
    password: { type: "string" },
  },
  required: ["email", "password"],
};

export const userVerifyEmailSchema = {
  type: "object",
  properties: {
    token: { type: "string" },
  },
  required: ["token"],
};

export const userLoginResponseSchema = {
  type: "object",
  properties: {
    message: { type: "string" },
    data: {
      type: "object",
      properties: {
        access: { type: "string" },
        refresh: { type: "string" },
      },
      required: ["access", "refresh"],
    },
  },
};

const userAttrs = {
  id: { type: "number" },
  email: { type: "string" },
  isActive: { type: "boolean" },
  role: { type: "string" },
  language: { type: "string" },
  timezone: { type: "string" },
  createdAt: { type: "string", format: "date-time" },
  updatedAt: { type: "string", format: "date-time" },
};

export const userResponseSchema = {
  type: "object",
  properties: {
    ...userAttrs,
    personId: { type: "number" },
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
    "personId",
  ],
};

export const userResponseSchemaIncludePerson = {
  type: "object",
  properties: {
    ...userAttrs,
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

export const messageResponseSchema = {
  type: "object",
  properties: { message: { type: "string" } },
  required: ["message"],
};

export const requestResetSchema = {
  type: "object",
  properties: { email: { type: "string", format: "email" } },
  required: ["email"],
};

export const resetPasswordSchema = {
  type: "object",
  properties: {
    token: { type: "string" },
    newPassword: { type: "string", minLength: 8, maxLength: 50 },
  },
  required: ["token", "newPassword"],
};

export const changePasswordSchema = {
  type: "object",
  properties: {
    password: { type: "string" },
    newPassword: { type: "string", minLength: 8, maxLength: 50 },
  },
  required: ["password", "newPassword"],
};

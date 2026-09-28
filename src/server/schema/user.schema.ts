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
    refresh: { type: "string" },
  },
  required: ["access", "refresh"],
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
  id: { type: "number", minimum: 1 },
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
    personId: { type: "number", minimum: 1 },
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
        id: { type: "number", minimum: 1 },
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

// Matches the SDK ApiCoordinatorInvitePost contract.
export const coordinatorInviteBodySchema = {
  type: "object",
  required: ["email", "person"],
  properties: {
    email: { type: "string", format: "email" },
    person: {
      type: "object",
      required: ["firstName", "lastName"],
      properties: {
        firstName: { type: "string", minLength: 1 },
        middleName: { type: ["string", "null"] },
        lastName: { type: "string", minLength: 1 },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
};

// Matches the SDK ApiCoordinatorInviteResponse contract.
export const coordinatorInviteResponseSchema = {
  type: "object",
  properties: {
    token: { type: "string" },
    link: { type: "string" },
    expiresAt: { type: "string", format: "date-time" },
  },
  required: ["token", "link", "expiresAt"],
};

export const registerWithInviteQuerySchema = {
  type: "object",
  properties: { token: { type: "string" } },
  required: ["token"],
};

// Matches the SDK ApiCoordinatorRegisterWithInvite contract.
export const registerWithInviteBodySchema = {
  type: "object",
  properties: { password: { type: "string", minLength: 8, maxLength: 50 } },
  required: ["password"],
};

export const changePasswordSchema = {
  type: "object",
  properties: {
    password: { type: "string" },
    newPassword: { type: "string", minLength: 8, maxLength: 50 },
  },
  required: ["password", "newPassword"],
};

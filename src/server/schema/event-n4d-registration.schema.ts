import {
  EVENT_SIGN_UP_ANSWER_MAX_LENGTH,
  OpportunityType,
} from "need4deed-sdk";
import { responseSchema } from "./response-schema";
import { responseErrors } from "./responseErrors";

export const eventN4DRegistrationBodySchema = {
  type: "object",
  required: ["eventId", "fullName", "email", "numberOfPeople"],
  additionalProperties: false,
  properties: {
    eventId: { type: "integer", minimum: 1 },
    fullName: { type: "string", minLength: 1 },
    email: { type: "string", minLength: 1, format: "email" },
    numberOfPeople: { type: "integer", minimum: 1, maximum: 1000 },
    signUpAnswer: {
      type: ["string", "null"],
      maxLength: EVENT_SIGN_UP_ANSWER_MAX_LENGTH,
    },
    message: { type: ["string", "null"], maxLength: 500 },
    isVolunteer: { type: "boolean" },
    volunteerTypes: {
      type: "array",
      uniqueItems: true,
      items: { type: "string", enum: Object.values(OpportunityType) },
    },
  },
};

export const eventN4DRegistrationPostResponseSchema = responseSchema({
  statusCode: 201,
});

export const eventN4DRegistrationPatchBodySchema = {
  type: "object",
  required: ["attended"],
  additionalProperties: false,
  properties: { attended: { type: "boolean" } },
};

const eventN4DRegistrationItemSchema = {
  type: "object",
  properties: {
    id: { type: "integer" },
    fullName: { type: "string" },
    email: { type: "string" },
    numberOfPeople: { type: "integer" },
    signUpAnswer: { type: ["string", "null"] },
    message: { type: ["string", "null"] },
    createdAt: { type: "string" },
    isVolunteer: { type: "boolean" },
    volunteerTypes: { type: "array", items: { type: "string" } },
    volunteerId: { type: ["integer", "null"] },
    attended: { type: "boolean" },
  },
};

export const eventN4DRegistrationPatchResponseSchema = {
  200: {
    type: "object",
    required: ["message", "data"],
    properties: {
      message: { type: "string" },
      data: eventN4DRegistrationItemSchema,
    },
  },
  ...responseErrors,
};

export const eventN4DRegistrationListResponseSchema = {
  200: {
    type: "object",
    required: ["message", "data"],
    additionalProperties: false,
    properties: {
      message: { type: "string" },
      data: {
        type: "object",
        required: ["registrations", "totalPeople"],
        properties: {
          registrations: {
            type: "array",
            items: eventN4DRegistrationItemSchema,
          },
          totalPeople: { type: "integer" },
        },
      },
    },
  },
  ...responseErrors,
};

export const volunteerEventN4DListResponseSchema = {
  200: {
    type: "object",
    required: ["message", "data"],
    additionalProperties: false,
    properties: {
      message: { type: "string" },
      data: {
        type: "array",
        items: {
          type: "object",
          required: ["registrationId", "eventId", "title", "date", "attended"],
          additionalProperties: false,
          properties: {
            registrationId: { type: "integer" },
            eventId: { type: "integer" },
            title: { type: "string" },
            date: { type: "string", format: "date-time" },
            attended: { type: "boolean" },
          },
        },
      },
    },
  },
  ...responseErrors,
};

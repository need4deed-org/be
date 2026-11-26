import { UserRole } from "need4deed-sdk";

export const OPPORTUNITY_FEEDBACK_TEXT_MAX_LENGTH = 5000;

export const opportunityFeedbackParamSchema = {
  type: "object",
  properties: {
    id: { type: "integer", minimum: 1 },
    feedbackId: { type: "integer", minimum: 1 },
  },
  required: ["id", "feedbackId"],
};

export const opportunityFeedbackBodySchema = {
  type: "object",
  properties: {
    text: {
      type: "string",
      pattern: "\\S",
      maxLength: OPPORTUNITY_FEEDBACK_TEXT_MAX_LENGTH,
    },
  },
  required: ["text"],
  additionalProperties: false,
};

const opportunityFeedbackSchema = {
  type: "object",
  properties: {
    id: { type: "number", minimum: 1 },
    opportunityId: { type: "number", minimum: 1 },
    authorUserId: { type: "number", minimum: 1 },
    authorName: { type: "string" },
    authorRole: { type: "string", enum: Object.values(UserRole) },
    text: { type: "string" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
  required: [
    "id",
    "opportunityId",
    "authorUserId",
    "authorName",
    "authorRole",
    "text",
    "createdAt",
    "updatedAt",
  ],
};

export const opportunityFeedbackSchemaGet200 = {
  type: "object",
  properties: {
    message: { type: "string" },
    data: { type: "array", items: opportunityFeedbackSchema },
  },
  required: ["message", "data"],
};

export const opportunityFeedbackSchemaWrite200 = {
  type: "object",
  properties: {
    message: { type: "string" },
    data: opportunityFeedbackSchema,
  },
  required: ["message", "data"],
};

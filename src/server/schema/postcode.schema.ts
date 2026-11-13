import { responseErrors } from "./responseErrors";

export const postcodeCheckQuerySchema = {
  type: "object",
  required: ["code"],
  properties: {
    code: { type: "string", pattern: "^\\s*\\d{4,5}\\s*$" },
  },
  additionalProperties: false,
};

export const postcodeCheckResponseSchema = {
  200: {
    type: "object",
    required: ["message", "data"],
    properties: {
      message: { type: "string" },
      data: {
        type: "object",
        required: ["code", "known"],
        properties: {
          code: { type: "string" },
          known: { type: "boolean" },
        },
      },
    },
  },
  ...responseErrors,
};

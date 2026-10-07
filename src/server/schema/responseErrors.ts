export const responseErrors = {
  400: {
    type: "object",
    properties: {
      error: { type: "string" },
      message: { type: "string" },
      errors: { type: "array", items: { type: "string" } },
    },
  },
  401: {
    type: "object",
    properties: { error: { type: "string" }, message: { type: "string" } },
  },
  403: {
    type: "object",
    properties: { error: { type: "string" }, message: { type: "string" } },
  },
  404: {
    type: "object",
    properties: { error: { type: "string" }, message: { type: "string" } },
  },
  409: {
    type: "object",
    properties: { error: { type: "string" }, message: { type: "string" } },
  },
  500: {
    type: "object",
    properties: { error: { type: "string" }, message: { type: "string" } },
  },
};

// error mirrors what the global error handler (server/index.ts) actually
// sends — error.constructor.name alongside message — so it isn't silently
// dropped by Fastify's response-schema serializer, which only outputs
// properties declared here regardless of what the handler put on the reply.
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

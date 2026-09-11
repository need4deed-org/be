export const volunteerAuditLogSchemaGet200 = {
  type: "object",
  properties: {
    message: { type: "string" },
    data: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "number" },
          volunteerId: { type: "number" },
          type: { type: "string" },
          detail: { type: "string" },
          actorUserId: { type: ["number", "null"] },
          occurredAt: { type: "string", format: "date-time" },
        },
        required: ["id", "volunteerId", "type", "detail", "occurredAt"],
      },
    },
  },
  required: ["message", "data"],
};

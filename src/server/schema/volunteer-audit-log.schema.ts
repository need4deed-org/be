import { VolunteerAuditLogType } from "need4deed-sdk";

export const volunteerAuditLogSchemaGet200 = {
  type: "object",
  properties: {
    message: { type: "string" },
    data: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "number", minimum: 1 },
          volunteerId: { type: "number", minimum: 1 },
          type: { type: "string", enum: Object.values(VolunteerAuditLogType) },
          detail: { type: "string" },
          actorUserId: { type: ["number", "null"], minimum: 1 },
          occurredAt: { type: "string", format: "date-time" },
        },
        required: ["id", "volunteerId", "type", "detail", "occurredAt"],
      },
    },
  },
  required: ["message", "data"],
};

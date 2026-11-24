import { OpportunityAuditLogType } from "need4deed-sdk";

export const opportunityAuditLogSchemaGet200 = {
  type: "object",
  properties: {
    message: { type: "string" },
    data: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "number", minimum: 1 },
          opportunityId: { type: "number", minimum: 1 },
          type: {
            type: "string",
            enum: Object.values(OpportunityAuditLogType),
          },
          detail: { type: "string" },
          actorUserId: { type: ["number", "null"], minimum: 1 },
          occurredAt: { type: "string", format: "date-time" },
        },
        required: ["id", "opportunityId", "type", "detail", "occurredAt"],
      },
    },
  },
  required: ["message", "data"],
};

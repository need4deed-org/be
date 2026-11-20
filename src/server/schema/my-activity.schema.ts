import {
  EntityTableName,
  MyActivityKind,
  VolunteerAuditLogType,
} from "need4deed-sdk";
import { responseErrors } from "./responseErrors";

export const MY_ACTIVITY_DEFAULT_LIMIT = 50;
const MY_ACTIVITY_MAX_LIMIT = 200;

export const MY_ACTIVITY_ENTITY_TYPES = [
  EntityTableName.AGENT,
  EntityTableName.OPPORTUNITY,
  EntityTableName.VOLUNTEER,
] as const;

const myActivityItemSchema = {
  type: "object",
  required: [
    "id",
    "kind",
    "occurredAt",
    "entityType",
    "entityId",
    "entityTitle",
    "text",
  ],
  additionalProperties: false,
  properties: {
    id: { type: "string" },
    kind: { type: "string", enum: Object.values(MyActivityKind) },
    occurredAt: { type: "string", format: "date-time" },
    entityType: { type: "string", enum: [...MY_ACTIVITY_ENTITY_TYPES] },
    entityId: { type: "integer" },
    entityTitle: { type: "string" },
    text: { type: "string" },
    changeType: { type: "string", enum: Object.values(VolunteerAuditLogType) },
  },
};

export const myActivityGetSchema = {
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      limit: { type: "integer", minimum: 1, maximum: MY_ACTIVITY_MAX_LIMIT },
    },
  },
  response: {
    200: {
      type: "object",
      required: ["message", "data"],
      properties: {
        message: { type: "string" },
        data: { type: "array", items: myActivityItemSchema },
      },
    },
    ...responseErrors,
  },
};

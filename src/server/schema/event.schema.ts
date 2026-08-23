import { EventN4DType } from "need4deed-sdk";
import { responseErrors } from "./responseErrors";

// Item shape for GET /event (SDK ApiEventN4DGetList). Inline, not $ref'd —
// event_n4d is a new domain, not yet part of the hand-maintained
// sdk-types.json bundle (which is already large enough as-is). Exported so a
// future GET /event/:id (epic #458) can reuse it instead of re-copying it.
export const eventItemSchema = {
  type: "object",
  properties: {
    id: { type: "integer" },
    active: { type: "boolean" },
    title: { type: "string" },
    subTitle: { type: ["string", "null"] },
    menuTitle: { type: "string" },
    date: { type: "string" },
    dateEnd: { type: ["string", "null"] },
    type: { type: "string", enum: Object.values(EventN4DType) },
    pic: { type: ["string", "null"] },
    address: { type: "string" },
    locationComment: { type: ["string", "null"] },
    description: { type: "string" },
    shortDescription: { type: "string" },
    linkRSVP: { type: "string" },
    additionalTitle: { type: ["string", "null"] },
    additionalInfo: {
      type: ["array", "null"],
      items: { type: "string" },
    },
  },
  required: [
    "id",
    "active",
    "title",
    "menuTitle",
    "date",
    "type",
    "address",
    "description",
    "shortDescription",
    "linkRSVP",
  ],
  additionalProperties: false,
};

export const eventListResponseSchema = {
  200: {
    type: "object",
    required: ["message", "data", "count"],
    properties: {
      message: { type: "string" },
      data: { type: "array", items: eventItemSchema },
      count: { type: "integer" },
    },
    additionalProperties: false,
  },
  ...responseErrors,
};

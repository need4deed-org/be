import { responseErrors } from "./responseErrors";

// GET /event's querystring: language only, no pagination — the only real
// caller (website's useEvents hook) never sends page/limit, just
// `?language=<lang>`.
export const eventListQuerySchema = {
  type: "object",
  properties: {
    language: { type: "string" },
  },
  additionalProperties: false,
};

// Item shape for GET /event (SDK ApiEventN4DGetList). Inline, not $ref'd —
// event_n4d is a new domain, not yet part of the hand-maintained
// sdk-types.json bundle (which is already large enough as-is).
const eventItemSchema = {
  type: "object",
  properties: {
    id: { type: "integer" },
    active: { type: "boolean" },
    title: { type: "string" },
    subTitle: { type: ["string", "null"] },
    menuTitle: { type: "string" },
    date: { type: "string" },
    dateEnd: { type: ["string", "null"] },
    type: { type: "string", enum: ["party", "workshop"] },
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

// GET /event replies with a bare array, not the usual {message, data, count}
// envelope — website's useEvents hook (the only real caller today) parses
// the response body directly as EventN4D[], predating this route's
// implementation. Matching that rather than the rest of this API's
// convention is deliberate here, not an oversight.
export const eventListResponseSchema = {
  200: { type: "array", items: eventItemSchema },
  ...responseErrors,
};

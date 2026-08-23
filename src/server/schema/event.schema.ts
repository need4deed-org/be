import { EventN4DType } from "need4deed-sdk";
import { getRef } from "../utils";
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

// Full detail shape for POST /event's response (SDK ApiEventN4DGet) — adds
// the fields eventItemSchema (the list shape) doesn't carry.
export const eventFullItemSchema = {
  ...eventItemSchema,
  properties: {
    ...eventItemSchema.properties,
    hostName: { type: ["string", "null"] },
    time: { type: ["string", "null"] },
    locationLink: { type: ["string", "null"] },
    followUpText: { type: ["string", "null"] },
    followUpLink: { type: ["string", "null"] },
    outro: { type: ["string", "null"] },
  },
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

// Body for POST /event (SDK ApiEventN4DTranslationInput).
const eventTranslationInputSchema = {
  type: "object",
  properties: {
    language: getRef("Lang#"),
    title: { type: "string", minLength: 1 },
    subTitle: { type: "string" },
    menuTitle: { type: "string", minLength: 1 },
    time: { type: "string" },
    locationComment: { type: "string" },
    description: { type: "string", minLength: 1 },
    shortDescription: { type: "string", minLength: 1 },
    additionalTitle: { type: "string" },
    additionalInfo: { type: "array", items: { type: "string" } },
    outro: { type: "string" },
    followUpText: { type: "string" },
  },
  required: [
    "language",
    "title",
    "menuTitle",
    "description",
    "shortDescription",
  ],
  additionalProperties: false,
};

// Body for POST /event (SDK ApiEventN4DCreate). translations requires at
// least one entry — enforced here rather than in application code.
export const eventCreateBodySchema = {
  type: "object",
  properties: {
    date: { type: "string", format: "date-time" },
    dateEnd: { type: "string", format: "date-time" },
    type: { type: "string", enum: Object.values(EventN4DType) },
    pic: { type: "string" },
    locationLink: { type: "string" },
    linkRSVP: { type: "string" },
    followUpLink: { type: "string" },
    address: { type: "string", minLength: 1 },
    hostName: { type: "string" },
    active: { type: "boolean" },
    translations: {
      type: "array",
      items: eventTranslationInputSchema,
      minItems: 1,
    },
  },
  required: ["date", "type", "linkRSVP", "address", "translations"],
  additionalProperties: false,
};

export const eventCreateResponseSchema = {
  201: {
    type: "object",
    required: ["message", "data"],
    properties: {
      message: { type: "string" },
      data: eventFullItemSchema,
    },
    additionalProperties: false,
  },
  ...responseErrors,
};

// Schemas for POST /volunteer/register?token=<verify-jwt> (be#943).
//
// The user + person already exist (created via POST /user + email
// verification, and possibly already linked to a pre-existing Person via
// be#947). Authorization is the verify token carried in the querystring (see
// the route's preHandler), not a logged-in session.
//
// Body shape mirrors sdk#222's proposed ApiVolunteerRegisterNew
// (https://github.com/need4deed-org/sdk/pull/222) field-for-field, flat (no
// "volunteer" wrapper) — sdk#222 is being revised to drop the nested
// { volunteer: ... } union in favor of this flat shape. Not yet an SDK $ref
// since sdk#222 isn't merged/published yet.

export const registerVolunteerQuerySchema = {
  type: "object",
  required: ["token"],
  additionalProperties: false,
  properties: {
    token: { type: "string", minLength: 1 },
  },
};

// ApiLanguage requires id+title here (matching the SDK's ApiLanguage TS
// type), kept as a local schema rather than $ref: "ApiLanguage#" — the
// globally-registered ApiLanguage# in sdk-types.json is out of sync with the
// SDK type (missing `id` entirely, and has a misplaced `additionalProperties`
// key nested inside `properties` instead of at the schema level), so
// reusing it here would silently accept language entries with no id.
const apiLanguageSchema = {
  type: "object",
  required: ["id", "title"],
  properties: {
    id: { type: "integer" },
    title: { type: "string" },
    proficiency: { type: "string" },
  },
};

export const volunteerRegisterBodySchema = {
  type: "object",
  required: ["addressPostcode"],
  additionalProperties: false,
  properties: {
    addressPostcode: { type: "string", minLength: 1 },
    locations: { type: "array", items: { $ref: "OptionById#" } },
    languages: { type: "array", items: apiLanguageSchema },
    availability: { type: "array", items: { $ref: "ApiAvailability#" } },
    activities: { type: "array", items: { $ref: "OptionItem#" } },
    skills: { type: "array", items: { $ref: "OptionItem#" } },
    leadFrom: { type: "array", items: { $ref: "OptionItem#" } },
    goodConductCertificate: { $ref: "DocumentStatusType#" },
    measlesVaccination: { $ref: "DocumentStatusType#" },
    comments: { type: "string" },
  },
};

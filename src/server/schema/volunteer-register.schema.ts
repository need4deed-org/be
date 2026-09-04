// Schemas for POST /volunteer/register?token=<verify-jwt> (be#943).
//
// The user + person already exist (created via POST /user + email
// verification, and possibly already linked to a pre-existing Person via
// be#947). Authorization is the verify token carried in the querystring (see
// the route's preHandler), not a logged-in session.
//
// Body shape mirrors sdk#222's proposed ApiVolunteerRegisterNew
// (https://github.com/need4deed-org/sdk/pull/222) field-for-field, since
// that's the contract this flow is adopting — not yet an SDK $ref since
// sdk#222 isn't merged/published yet.

export const registerVolunteerQuerySchema = {
  type: "object",
  required: ["token"],
  additionalProperties: false,
  properties: {
    token: { type: "string", minLength: 1 },
  },
};

// OptionById — id required, title optional (sdk#222).
const optionByIdSchema = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "integer" },
    title: { type: "string" },
  },
};

// OptionItem — id and title both required (sdk#222).
const optionItemSchema = {
  type: "object",
  required: ["id", "title"],
  properties: {
    id: { type: "integer" },
    title: { type: "string" },
    isoCode: { type: "string" },
  },
};

// ApiLanguage (sdk#222) — purpose omitted here, not meaningful for a
// volunteer's own languages (see parser-volunteer-self-register.ts).
const apiLanguageSchema = {
  type: "object",
  required: ["id", "title"],
  properties: {
    id: { type: "integer" },
    title: { type: "string" },
    proficiency: { type: "string" },
  },
};

// ApiAvailability (sdk#222) — all fields optional.
const apiAvailabilitySchema = {
  type: "object",
  properties: {
    id: { type: "integer" },
    day: { type: "string" },
    daytime: { type: "string" },
  },
};

export const volunteerRegisterBodySchema = {
  type: "object",
  required: ["volunteer"],
  additionalProperties: false,
  properties: {
    volunteer: {
      type: "object",
      required: ["addressPostcode"],
      additionalProperties: false,
      properties: {
        addressPostcode: { type: "string", minLength: 1 },
        locations: { type: "array", items: optionByIdSchema },
        languages: { type: "array", items: apiLanguageSchema },
        availability: { type: "array", items: apiAvailabilitySchema },
        activities: { type: "array", items: optionItemSchema },
        skills: { type: "array", items: optionItemSchema },
        leadFrom: { type: "array", items: optionItemSchema },
        goodConductCertificate: { type: "string" },
        measlesVaccination: { type: "string" },
        comments: { type: "string" },
      },
    },
  },
};

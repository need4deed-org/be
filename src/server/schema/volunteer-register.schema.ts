// Schemas for POST /volunteer/register?token=<verify-jwt> (be#943).
//
// The user + person already exist (created via POST /user + email
// verification, and possibly already linked to a pre-existing Person via
// be#947). Authorization is the verify token carried in the querystring (see
// the route's preHandler), not a logged-in session.
//
// Body shape mirrors fe's VolunteerRegistration/ProfileCompletion (fe#972)
// as literally as possible — not yet an SDK type since fe#972 itself hasn't
// merged/stabilized. Numeric-id-based (locations/activities/skills/leadFrom,
// languages[].language as a stringified id), same pattern as
// dealParserOpportunityCreate/POST /opportunity, not the legacy title-based
// form.

export const registerVolunteerQuerySchema = {
  type: "object",
  required: ["token"],
  additionalProperties: false,
  properties: {
    token: { type: "string", minLength: 1 },
  },
};

const timeSlotSchema = {
  type: "object",
  required: ["id", "selected"],
  properties: {
    id: { type: "string" },
    selected: { type: "boolean" },
  },
};

const availabilityDaySchema = {
  type: "object",
  required: ["weekday", "timeSlots"],
  properties: {
    weekday: { type: "integer", minimum: 0, maximum: 7 },
    timeSlots: { type: "array", items: timeSlotSchema },
  },
};

const languageEntrySchema = {
  type: "object",
  required: ["id", "language", "level"],
  properties: {
    id: { type: "integer" },
    // The Language option id, stringified by fe's <select> control.
    language: { type: "string" },
    level: { type: "string" },
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
        locations: { type: "array", items: { type: "integer" } },
        languages: { type: "array", items: languageEntrySchema },
        availability: { type: "array", items: availabilityDaySchema },
        activities: { type: "array", items: { type: "integer" } },
        skills: { type: "array", items: { type: "integer" } },
        leadFrom: { type: "array", items: { type: "integer" } },
        goodConductCertificate: { type: "string" },
        measlesVaccination: { type: "string" },
        comments: { type: "string" },
      },
    },
  },
};

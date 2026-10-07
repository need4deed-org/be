export const registerVolunteerQuerySchema = {
  type: "object",
  required: ["token"],
  additionalProperties: false,
  properties: {
    token: { type: "string", minLength: 1 },
  },
};

const apiLanguageSchema = {
  type: "object",
  required: ["id", "title"],
  properties: {
    id: { type: "integer", minimum: 1 },
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

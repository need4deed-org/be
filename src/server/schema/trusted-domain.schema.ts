const trustedDomainSchema = {
  type: "object",
  required: ["id", "domain"],
  additionalProperties: false,
  properties: {
    id: { type: "integer", minimum: 1 },
    domain: { type: "string" },
  },
};

export const trustedDomainListResponseSchema = {
  type: "object",
  required: ["message", "data"],
  properties: {
    message: { type: "string" },
    data: { type: "array", items: trustedDomainSchema },
  },
};

export const trustedDomainItemResponseSchema = {
  type: "object",
  required: ["message", "data"],
  properties: {
    message: { type: "string" },
    data: trustedDomainSchema,
  },
};

const DOMAIN_PATTERN =
  "^(?=.{1,253}$)([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\\.)+[a-zA-Z]{2,}$";

export const trustedDomainBodySchema = {
  type: "object",
  required: ["domain"],
  additionalProperties: false,
  properties: {
    domain: { type: "string", pattern: DOMAIN_PATTERN },
  },
};

export const idParamSchema = {
  type: "object",
  properties: {
    id: { type: "integer" },
  },
  required: ["id"],
};

export const idTypeParamSchema = {
  type: "object",
  properties: {
    id: { type: "integer" },
    type: { $ref: "DocumentType#" },
  },
  required: ["id", "type"],
};

export const idmM2mIdParamSchema = {
  type: "object",
  properties: {
    id: { type: "integer" },
    m2mId: { type: "integer" },
  },
  required: ["id", "m2mId"],
};

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

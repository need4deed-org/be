export const idParamSchema = {
  type: "object",
  properties: {
    id: { type: "integer" },
  },
  required: ["id"],
};

export const idFileParamSchema = {
  type: "object",
  properties: {
    id: { type: "integer" },
    docId: { type: "integer" },
  },
  required: ["id", "docId"],
};

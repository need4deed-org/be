export const idParamSchema = {
  type: "object",
  properties: {
    id: { type: "integer" },
  },
  required: ["id"],
};
export type IdParam = { id: number };

export const idTypeParamSchema = {
  type: "object",
  properties: {
    id: { type: "integer" },
    type: { $ref: "DocumentType#" },
  },
  required: ["id", "type"],
};
export type IdTypeParam = { id: number; type: string };

export const idmM2mIdParamSchema = {
  type: "object",
  properties: {
    id: { type: "integer" },
    m2mId: { type: "integer" },
  },
  required: ["id", "m2mId"],
};
export type IdM2mIdParam = { id: number; m2mId: number };

import { getRef } from "../utils";

export const idParamSchema = {
  type: "object",
  properties: {
    id: { type: "integer", minimum: 1 },
  },
  required: ["id"],
};
export type IdParam = { id: number };

export const idTypeParamSchema = {
  type: "object",
  properties: {
    id: { type: "integer", minimum: 1 },
    type: getRef("DocumentType#"),
  },
  required: ["id", "type"],
};
export type IdTypeParam = { id: number; type: string };

export const idmM2mIdParamSchema = {
  type: "object",
  properties: {
    id: { type: "integer", minimum: 1 },
    m2mId: { type: "integer" },
  },
  required: ["id", "m2mId"],
};
export type IdM2mIdParam = { id: number; m2mId: number };

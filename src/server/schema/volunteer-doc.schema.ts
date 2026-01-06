export const volunteerDocSchemaGet200 = {
  type: "object",
  properties: {
    message: { type: "string" },
    data: { type: "array", items: { $ref: "ApiDocumentGet#" } },
  },
  required: ["message", "data"],
};

export const volunteerDocSchemaPostBody = { $ref: "ApiDocumentPost#" };
export const volunteerDocSchemaPost200 = { url: { type: "string" } };
export const volunteerDocSchemaUploadMeta200 = {
  type: "object",
  properties: {
    mimeType: { type: "string" },
    originalName: { type: "string" },
    type: { $ref: "DocumentType#" },
  },
  required: ["mimeType", "originalName", "type"],
};

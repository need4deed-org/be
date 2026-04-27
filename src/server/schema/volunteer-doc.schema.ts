export const volunteerDocSchemaGet200 = {
  type: "object",
  properties: {
    message: { type: "string" },
    data: { type: "array", items: { $ref: "ApiDocumentGet#" } },
  },
  required: ["message", "data"],
};

export const volunteerDocSchemaGetMeta200 = {
  type: "object",
  properties: {
    url: { type: "string" },
    fields: {
      type: "object",
      properties: {
        bucket: { type: "string" },
        key: { type: "string" },
        Policy: { type: "string" },
        "X-Amz-Algorithm": { type: "string" },
        "X-Amz-Credential": { type: "string" },
        "X-Amz-Date": { type: "string" },
        "X-Amz-Signature": { type: "string" },
        "x-amz-meta-volunteer-id": { type: "string" },
        "x-amz-meta-document-type": { $ref: "DocumentType#" },
        "x-amz-meta-original-name": { type: "string" },
        "x-amz-meta-mime-type": { type: "string" },
        "x-amz-meta-s3-key": { type: "string" },
      },
      // required: [],
    },
  },
  required: ["url", "fields"],
};

export const volunteerDocSchemaPatchBody = {
  type: "object",
  properties: {
    received: { type: "boolean" },
  },
  required: ["received"],
};

export const volunteerDocSchemaUploadMeta = {
  type: "object",
  properties: {
    mimeType: { type: "string" },
    originalName: { type: "string" },
    type: { $ref: "DocumentType#" },
  },
  required: ["mimeType", "originalName", "type"],
};

import { ApplicationEmailFailureReason } from "need4deed-sdk";

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
    },
  },
  required: ["url", "fields"],
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

export const volunteerDocSchemaApplicationEmail201 = {
  type: "object",
  properties: {
    message: { type: "string" },
    data: {
      type: "object",
      properties: { sentAt: { type: "string", format: "date-time" } },
      required: ["sentAt"],
    },
  },
  required: ["message", "data"],
};

const applicationEmailFailureReasons = Object.keys({
  "attachment-unavailable": true,
  "email-invalid": true,
  "render-failed": true,
  "send-failed": true,
} satisfies Record<ApplicationEmailFailureReason, true>);

export const volunteerDocSchemaApplicationEmail502 = {
  type: "object",
  properties: {
    error: { type: "string" },
    message: { type: "string" },
    reason: { type: "string", enum: applicationEmailFailureReasons },
  },
  required: ["error", "message", "reason"],
};

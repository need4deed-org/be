import { EmailTemplateLayout, EmailTemplateName } from "need4deed-sdk";
import { responseErrors } from "./responseErrors";

const templateSchema = {
  type: "object",
  required: ["layout", "content"],
  properties: {
    layout: { type: "string", enum: Object.values(EmailTemplateLayout) },
    content: { type: "object", additionalProperties: true },
  },
};

const emailTemplateSchema = {
  type: "object",
  required: [
    "name",
    "editable",
    "version",
    "template",
    "placeholders",
    "labelKeys",
    "hasHtml",
  ],
  properties: {
    name: { type: "string" },
    editable: { type: "boolean" },
    version: { type: "string" },
    template: templateSchema,
    placeholders: {
      type: "array",
      items: {
        type: "object",
        required: ["name", "required"],
        properties: {
          name: { type: "string" },
          required: { type: "boolean" },
        },
      },
    },
    labelKeys: { type: "array", items: { type: "string" } },
    hasHtml: { type: "boolean" },
    cdnCacheSeconds: { type: "integer" },
  },
};

const saveErrorSchema = {
  type: "object",
  properties: {
    error: { type: "string" },
    message: { type: "string" },
    code: { type: "string" },
    lang: { type: "string" },
    placeholders: { type: "array", items: { type: "string" } },
    fields: { type: "array", items: { type: "string" } },
  },
};

export const emailTemplateParamsSchema = {
  type: "object",
  required: ["name"],
  properties: {
    name: { type: "string", enum: Object.values(EmailTemplateName) },
  },
};

export const emailTemplateListResponseSchema = {
  type: "object",
  required: ["message", "data"],
  properties: {
    message: { type: "string" },
    data: {
      type: "object",
      required: ["editable", "templates"],
      properties: {
        editable: { type: "boolean" },
        templates: {
          type: "array",
          items: {
            type: "object",
            required: ["name", "layout"],
            properties: {
              name: { type: "string" },
              layout: { type: "string" },
            },
          },
        },
      },
    },
  },
};

export const emailTemplateItemResponseSchema = {
  type: "object",
  required: ["message", "data"],
  properties: {
    message: { type: "string" },
    data: emailTemplateSchema,
  },
};

export const emailTemplatePutBodySchema = {
  type: "object",
  required: ["version", "template"],
  additionalProperties: false,
  properties: {
    version: { type: "string" },
    template: templateSchema,
  },
};

export const emailTemplateSaveResponseErrors = {
  ...responseErrors,
  400: saveErrorSchema,
  403: saveErrorSchema,
  409: saveErrorSchema,
};

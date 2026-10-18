import {
  StatisticsGranularity,
  StatisticsGroupBy,
  StatisticsMetric,
} from "need4deed-sdk";

const countsSchema = {
  type: "object",
  additionalProperties: { type: "integer" },
};

const optionTitleSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    en: { type: "string" },
    de: { type: "string" },
  },
};

export const statisticsParamsSchema = {
  type: "object",
  required: ["metric"],
  properties: {
    metric: { type: "string", enum: Object.values(StatisticsMetric) },
  },
};

export const statisticsQuerySchema = {
  type: "object",
  required: ["granularity"],
  additionalProperties: false,
  properties: {
    granularity: {
      type: "string",
      enum: Object.values(StatisticsGranularity),
    },
    from: { type: "string", format: "date" },
    to: { type: "string", format: "date" },
    groupBy: { type: "string", enum: Object.values(StatisticsGroupBy) },
  },
};

export const statisticsResponseSchema = {
  type: "object",
  required: ["message", "data"],
  properties: {
    message: { type: "string" },
    data: {
      type: "object",
      required: [
        "metric",
        "granularity",
        "groupBy",
        "allowedGroupBy",
        "groups",
        "periods",
      ],
      additionalProperties: false,
      properties: {
        metric: { type: "string" },
        granularity: { type: "string" },
        groupBy: { type: "string" },
        allowedGroupBy: { type: "array", items: { type: "string" } },
        groups: {
          type: "array",
          items: {
            type: "object",
            required: ["key", "title"],
            additionalProperties: false,
            properties: {
              key: { type: "string" },
              title: optionTitleSchema,
            },
          },
        },
        periods: {
          type: "array",
          items: {
            type: "object",
            required: ["period", "start", "counts", "total"],
            additionalProperties: false,
            properties: {
              period: { type: "string" },
              start: { type: "string", format: "date-time" },
              counts: countsSchema,
              total: { type: "integer" },
            },
          },
        },
        totalsBeforeTracking: countsSchema,
      },
    },
  },
};

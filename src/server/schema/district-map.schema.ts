import { responseErrors } from "./responseErrors";

const filterValueSchema = {
  anyOf: [
    { type: "string" },
    { type: "number" },
    { type: "boolean" },
    {
      type: "array",
      items: {
        anyOf: [{ type: "string" }, { type: "number" }],
      },
    },
  ],
};

const agentFilterProperties = {
  type: filterValueSchema,
  status: filterValueSchema,
  engagementStatus: filterValueSchema,
  services: filterValueSchema,
  volunteerSearch: filterValueSchema,
};

const opportunityFilterProperties = {
  type: filterValueSchema,
  status: filterValueSchema,
  activity: filterValueSchema,
  skill: filterValueSchema,
  match: filterValueSchema,
  agentId: {
    anyOf: [
      { type: "integer", minimum: 1 },
      {
        type: "array",
        items: { type: "integer", minimum: 1 },
      },
    ],
  },
  language: filterValueSchema,
  availability: filterValueSchema,
};

const volunteerFilterProperties = {
  type: filterValueSchema,
  language: filterValueSchema,
  activity: filterValueSchema,
  skill: filterValueSchema,
  availability: filterValueSchema,
  engagement: filterValueSchema,
  match: filterValueSchema,
};

function aggregateQuerySchema(filterProperties: Record<string, unknown>) {
  return {
    type: "object",
    properties: {
      filter: {
        type: "object",
        properties: filterProperties,
        additionalProperties: false,
      },
    },
    additionalProperties: false,
  };
}

function markerQuerySchema(filterProperties: Record<string, unknown>) {
  return {
    type: "object",
    properties: {
      districtId: { type: "integer", minimum: 1 },
      language: { type: "string" },
      filter: {
        type: "object",
        properties: filterProperties,
        additionalProperties: false,
      },
    },
    required: ["districtId", "language"],
    additionalProperties: false,
  };
}

export const agentDistrictAggregateQuerySchema = aggregateQuerySchema(
  agentFilterProperties,
);
export const opportunityDistrictAggregateQuerySchema = aggregateQuerySchema(
  opportunityFilterProperties,
);
export const volunteerDistrictAggregateQuerySchema = aggregateQuerySchema(
  volunteerFilterProperties,
);
export const agentDistrictMarkerQuerySchema = markerQuerySchema(
  agentFilterProperties,
);
export const opportunityDistrictMarkerQuerySchema = markerQuerySchema(
  opportunityFilterProperties,
);
export const volunteerDistrictMarkerQuerySchema = markerQuerySchema(
  volunteerFilterProperties,
);

const districtAggregateSchema = {
  type: "object",
  properties: {
    districts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          districtId: { type: "integer" },
          count: { type: "integer", minimum: 0 },
        },
        required: ["districtId", "count"],
        additionalProperties: false,
      },
    },
    unassignedBerlin: { type: "integer", minimum: 0 },
    outsideBerlin: { type: "integer", minimum: 0 },
    remote: { type: "integer", minimum: 0 },
  },
  required: ["districts", "unassignedBerlin", "outsideBerlin", "remote"],
  additionalProperties: false,
};

const districtMarkerGetSchema = {
  type: "object",
  properties: {
    markers: {
      type: "array",
      items: {
        type: "object",
        properties: {
          lat: { anyOf: [{ type: "number" }, { type: "null" }] },
          lon: { anyOf: [{ type: "number" }, { type: "null" }] },
          districtId: { type: "integer" },
          children: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "integer" },
                title: { type: "string" },
                languages: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "integer" },
                      title: { type: "string" },
                      proficiency: { type: "string" },
                      purpose: { type: "string" },
                    },
                    required: ["id", "title"],
                  },
                },
                availability: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "integer" },
                      day: { type: "string" },
                      daytime: { type: "string" },
                    },
                  },
                },
                type: {
                  type: "object",
                  properties: {
                    id: { type: "integer" },
                    title: {
                      type: "object",
                      properties: {
                        en: { type: "string" },
                        de: { type: "string" },
                      },
                      additionalProperties: false,
                    },
                  },
                  required: ["id", "title"],
                  additionalProperties: false,
                },
                statusTypes: { type: "array", items: { type: "string" } },
                district: { type: "object" },
              },
              required: ["id", "title"],
            },
          },
          entity: {
            type: "string",
            enum: ["agent", "opportunity", "volunteer"],
          },
        },
        required: ["lat", "lon", "districtId", "children", "entity"],
        additionalProperties: false,
      },
    },
    total: { type: "integer", minimum: 0 },
    maxEntities: { type: "integer", minimum: 1 },
  },
  required: ["markers", "total", "maxEntities"],
  additionalProperties: false,
};

export const districtAggregateResponseSchema = {
  200: {
    type: "object",
    properties: {
      message: { type: "string" },
      data: districtAggregateSchema,
    },
    required: ["message", "data"],
  },
  ...responseErrors,
};

export const districtMarkerResponseSchema = {
  200: {
    type: "object",
    properties: {
      message: { type: "string" },
      data: districtMarkerGetSchema,
    },
    required: ["message", "data"],
  },
  ...responseErrors,
};

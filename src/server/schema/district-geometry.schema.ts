export const positionSchema = {
  type: "array",
  items: { type: "number" },
  minItems: 2,
};

export const linearRingSchema = {
  type: "array",
  items: positionSchema,
  minItems: 4,
};

export const polygonCoordinatesSchema = {
  type: "array",
  items: linearRingSchema,
  minItems: 1,
};

export const multiPolygonCoordinatesSchema = {
  type: "array",
  items: polygonCoordinatesSchema,
  minItems: 1,
};

export const districtGeometrySchema = {
  type: "object",
  required: ["type", "features"],
  properties: {
    type: { const: "FeatureCollection" },
    features: {
      type: "array",
      items: {
        type: "object",
        required: ["type", "geometry", "properties"],
        properties: {
          type: { const: "Feature" },
          geometry: {
            oneOf: [
              {
                type: "object",
                required: ["type", "coordinates"],
                properties: {
                  type: { const: "Polygon" },
                  coordinates: polygonCoordinatesSchema,
                },
              },
              {
                type: "object",
                required: ["type", "coordinates"],
                properties: {
                  type: { const: "MultiPolygon" },
                  coordinates: multiPolygonCoordinatesSchema,
                },
              },
            ],
          },
          properties: {
            type: "object",
            required: ["districtId", "title"],
            properties: {
              districtId: { type: "integer" },
              title: { type: "string" },
            },
          },
        },
      },
    },
  },
};

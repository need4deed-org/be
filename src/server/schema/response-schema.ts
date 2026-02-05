import { getRef } from "../utils";
import { responseErrors } from "./responseErrors";

export function responseSchema(
  dataSchemaRef: string,
  isArray = false,
  count = true,
) {
  return {
    200: {
      type: "object",
      properties: {
        message: { type: "string" },
        ...(count ? { count: { type: "number" } } : {}),
        data: isArray
          ? {
              type: "array",
              items: {
                $ref: dataSchemaRef,
              },
            }
          : getRef(dataSchemaRef),
      },
      required: ["message", "data"],
      additionalProperties: false,
    },
    ...responseErrors,
  };
}

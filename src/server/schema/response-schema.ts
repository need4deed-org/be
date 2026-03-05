import { getRef } from "../utils";
import { responseErrors } from "./responseErrors";

export function responseSchema(
  dataSchemaRef: string,
  isArray = false,
  count = isArray,
) {
  return {
    200: {
      type: "object",
      properties: {
        message: { type: "string" },
        ...(count ? { count: { type: "number" } } : {}),
        ...(dataSchemaRef
          ? {
              data: isArray
                ? {
                    type: "array",
                    items: getRef(dataSchemaRef),
                  }
                : getRef(dataSchemaRef),
            }
          : {}),
      },
      required: ["message", ...(dataSchemaRef ? ["data"] : [])],
      additionalProperties: false,
    },
    ...responseErrors,
  };
}

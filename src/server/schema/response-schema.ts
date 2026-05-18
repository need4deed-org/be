import { getRef } from "../utils";
import { responseErrors } from "./responseErrors";

interface ResponseSchemaOptions {
  dataSchemaRef?: string;
  isArray?: boolean;
  count?: boolean;
  statusCode?: 200 | 201 | 204;
}

export function responseSchema(
  refOrOptions: string | ResponseSchemaOptions,
  isArray = false,
  count = isArray,
) {
  const opts: ResponseSchemaOptions =
    typeof refOrOptions === "string"
      ? { dataSchemaRef: refOrOptions, isArray, count }
      : refOrOptions;

  const {
    dataSchemaRef = "",
    isArray: isArr = false,
    count: withCount = isArr,
    statusCode = 200,
  } = opts;

  if (statusCode === 204) {
    return {
      204: { type: "null" },
      ...responseErrors,
    };
  }

  return {
    [statusCode]: {
      type: "object",
      properties: {
        message: { type: "string" },
        ...(withCount ? { count: { type: "number" } } : {}),
        ...(dataSchemaRef
          ? {
              data: isArr
                ? { type: "array", items: getRef(dataSchemaRef) }
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

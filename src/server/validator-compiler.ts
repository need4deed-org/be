import { AjvCompiler } from "@fastify/ajv-compiler";
import { FastifyServerOptions } from "fastify";

type BuildValidator = NonNullable<
  NonNullable<
    NonNullable<FastifyServerOptions["schemaController"]>["compilersFactory"]
  >["buildValidator"]
>;

const buildCompiler = AjvCompiler();

// In a JSON body, coercion would silently store null as "" / 0 / false.
export const buildValidator: BuildValidator = (externalSchemas, ajvOptions) => {
  const coercing = buildCompiler(externalSchemas, ajvOptions);
  let strictBody: ReturnType<typeof buildCompiler> | undefined;
  return (route) => {
    if (route.httpPart !== "body") {
      return coercing(route);
    }
    strictBody ??= buildCompiler(externalSchemas, {
      ...ajvOptions,
      customOptions: { ...ajvOptions?.customOptions, coerceTypes: false },
    });
    return strictBody(route);
  };
};

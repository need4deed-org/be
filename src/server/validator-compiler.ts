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
  const strictBody = buildCompiler(externalSchemas, {
    ...ajvOptions,
    customOptions: { ...ajvOptions?.customOptions, coerceTypes: false },
  });
  return (route) =>
    route.httpPart === "body" ? strictBody(route) : coercing(route);
};

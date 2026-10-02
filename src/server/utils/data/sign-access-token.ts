import { FastifyInstance } from "fastify";
import { ACCESS_LIFESPAN_MS } from "../../../config/constants";
import User from "../../../data/entity/user.entity";
import { buildAuthUserPayload } from "./build-auth-user-payload";

export function signAccessToken(fastify: FastifyInstance, user: User): string {
  return fastify.jwt.sign(
    { ...buildAuthUserPayload(user), type: "access" },
    { expiresIn: `${ACCESS_LIFESPAN_MS}` },
  );
}

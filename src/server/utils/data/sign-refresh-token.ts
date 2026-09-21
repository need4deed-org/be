import { FastifyInstance } from "fastify";
import { REFRESH_LIFESPAN_MS } from "../../../config/constants";
import User from "../../../data/entity/user.entity";
import { buildAuthUserPayload } from "./build-auth-user-payload";

// Paired with signAccessToken — see be#1024.
export function signRefreshToken(fastify: FastifyInstance, user: User): string {
  return fastify.jwt.sign(
    { ...buildAuthUserPayload(user), type: "refresh" },
    { expiresIn: `${REFRESH_LIFESPAN_MS}` },
  );
}

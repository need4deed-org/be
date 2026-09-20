import { FastifyInstance } from "fastify";
import { ACCESS_LIFESPAN_MS } from "../../../config/constants";
import User from "../../../data/entity/user.entity";
import { buildAuthUserPayload } from "./build-auth-user-payload";

// The single place that signs an access token, used by both login and
// refresh — see be#1024, where those two call sites had drifted apart and
// dropped `role` from the refresh-issued token.
export function signAccessToken(fastify: FastifyInstance, user: User): string {
  return fastify.jwt.sign(
    { ...buildAuthUserPayload(user), type: "access" },
    { expiresIn: `${ACCESS_LIFESPAN_MS}` },
  );
}

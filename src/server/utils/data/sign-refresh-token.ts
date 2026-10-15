import { FastifyInstance } from "fastify";
import { REFRESH_LIFESPAN_MS } from "../../../config/constants";
import User from "../../../data/entity/user.entity";
import { buildAuthUserPayload } from "./build-auth-user-payload";
import { RefreshSessionIds } from "./refresh-session";

export function signRefreshToken(
  fastify: FastifyInstance,
  user: User,
  { sid, jti }: RefreshSessionIds,
): string {
  return fastify.jwt.sign(
    { ...buildAuthUserPayload(user), type: "refresh", sid, jti },
    { expiresIn: `${REFRESH_LIFESPAN_MS}` },
  );
}

import User from "../../../data/entity/user.entity";

export function buildAuthUserPayload(user: User) {
  return { id: user.id, email: user.email, role: user.role };
}

import User from "../../../data/entity/user.entity";

// The shared shape signed into both the login and refresh access/refresh
// tokens. Kept in one place after be#1023, where the refresh handler had
// drifted to signing { id, email } without `role`, silently downgrading
// every refreshed session to an unauthorized role.
export function buildAuthUserPayload(user: User) {
  return { id: user.id, email: user.email, role: user.role };
}

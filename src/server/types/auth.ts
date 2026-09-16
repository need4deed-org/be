import { ApiCoordinatorInvitePost, UserRole } from "need4deed-sdk";

export interface AuthOptions {
  role?: UserRole;
  allowSelf?: boolean;
}

// Single source for the invite payload's person shape — shared by the
// coordinator-invite JWT payload and request.coordinatorInvite (fastify.d.ts)
// and its consuming route (routes/user.ts), instead of three structurally
// identical inline copies (be#1008 review).
export type CoordinatorInvitePerson = ApiCoordinatorInvitePost["person"];

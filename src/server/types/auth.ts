import { ApiCoordinatorInvitePost, UserRole } from "need4deed-sdk";

export interface AuthOptions {
  role?: UserRole;
  allowSelf?: boolean;
}

export type CoordinatorInvitePerson = ApiCoordinatorInvitePost["person"];

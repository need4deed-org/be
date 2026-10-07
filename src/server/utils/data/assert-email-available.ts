import { IsNull, Repository } from "typeorm";
import { ConflictError } from "../../../config";
import User from "../../../data/entity/user.entity";

// What to do when the only User holding the email is a pending one (see
// isPendingUser):
// - "reject": treat it like any other User — 409;
// - "allow": treat the email as available, but leave the row alone (for a
//   caller that doesn't create the User itself, e.g. generating an invite);
// - "reclaim": delete the pending row so the caller can create a new User
//   for the email (be#1012).
export type PendingUserPolicy = "reject" | "allow" | "reclaim";

// A User that registered but never verified its email: inactive, but not
// deactivated (self-service deletion / GDPR erasure stamp deactivatedAt,
// be#1007). Nobody has proven control of the mailbox, so it must not hold
// the email forever — anyone can self-register any email via public
// POST /user (be#1012).
export function isPendingUser(user: User): boolean {
  return !user.isActive && !user.deactivatedAt;
}

// Shared "no User already owns this email" guard used by every
// User-creation route (POST /user, POST /user/admin,
// POST /user/admin/coordinator-invite, POST /user/register-with-invite) —
// this was copy-pasted four times (be#1011 review). The check is a fast
// path, not the guarantee — a concurrent duplicate falls through to the
// global error handler via the DB's unique constraint on User.email rather
// than a clean 409, the same trade-off already made everywhere this guard
// is used.
export async function assertEmailAvailable(
  userRepository: Repository<User>,
  email: string,
  pending: PendingUserPolicy = "reject",
): Promise<void> {
  const existing = await userRepository.findOneBy({ email });
  if (!existing) {
    return;
  }
  if (pending === "reject" || !isPendingUser(existing)) {
    throw new ConflictError("User with this email already exists.");
  }
  if (pending === "allow") {
    return;
  }

  // Deleted, not overwritten: the new User gets a new id, so a verification
  // link issued to the pending one can't activate its replacement. The
  // pending condition is repeated so a row verified since the read above
  // is never deleted.
  const { affected } = await userRepository.delete({
    id: existing.id,
    isActive: false,
    deactivatedAt: IsNull(),
  });
  if (!affected) {
    throw new ConflictError("User with this email already exists.");
  }
}

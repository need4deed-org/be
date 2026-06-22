import { ApiUserGet } from "need4deed-sdk";
import User from "../../data/entity/user.entity";

export function serializeUserToMeDTO(
  user: User,
  agentId?: number,
): ApiUserGet & { agentId?: number } {
  return {
    id: user.id,
    // personId is nullable (person-less users); emit undefined so the
    // serializer omits it rather than coercing null to 0.
    personId: user.personId ?? undefined,
    email: user.email,
    isActive: user.isActive,
    role: user.role,
    firstName: user.person?.firstName || "",
    fullName: user.person?.name || "",
    avatarUrl: user.person?.avatarUrl || "",
    isoCode: user.language || "en",
    timezone: user.timezone || "CET",
    agentId,
  };
}

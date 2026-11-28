import {
  ApiAgentMembershipSummary,
  ApiUserGet,
  ApiUserPostReply,
} from "need4deed-sdk";
import User from "../../data/entity/user.entity";

export function serializeUserToMeDTO(
  user: User,
  agentId?: number,
  agentMemberships?: ApiAgentMembershipSummary[],
  volunteerId?: number,
): ApiUserGet {
  return {
    id: user.id,
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
    agentMemberships,
    volunteerId,
    deactivatedAt: user.deactivatedAt ?? null,
  };
}

export function dtoUserPostReply(user: User): ApiUserPostReply {
  return { id: user.id, isActive: user.isActive };
}

import { ApiUserGet } from "need4deed-sdk";
import User from "../../data/entity/user.entity";

export function serializeUserToMeDTO(user: User): ApiUserGet {
  return {
    id: user.id,
    email: user.email,
    isActive: user.isActive,
    role: user.role,
    firstName: user.person?.firstName || "",
    fullName: user.person?.name || "",
    avatarUrl: user.person?.avatarUrl || "",
    isoCode: user.language || "en",
    timezone: user.timezone || "CET",
  };
}

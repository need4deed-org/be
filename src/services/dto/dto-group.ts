import { ApiGroupCounts, ApiGroupGet } from "need4deed-sdk";
import VolunteerGroup from "../../data/entity/volunteer-group.entity";

export function dtoGroupGet(
  group: VolunteerGroup,
  counts: ApiGroupCounts,
): ApiGroupGet {
  if (group.organizationId !== null) {
    return {
      id: group.id,
      title: group.title,
      organizationId: group.organizationId,
      organizationTitle: group.organization?.title ?? "",
      agentId: null,
      agentTitle: null,
      counts,
      createdAt: group.createdAt,
    };
  }
  return {
    id: group.id,
    title: group.title,
    organizationId: null,
    organizationTitle: null,
    agentId: group.agentId!,
    agentTitle: group.agent?.title ?? "",
    counts,
    createdAt: group.createdAt,
  };
}

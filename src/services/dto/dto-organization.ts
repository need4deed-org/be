import { ApiOrganizationGetList } from "need4deed-sdk";
import Organization from "../../data/entity/organization.entity";

export function dtoOrganizationGetList(
  organization: Organization,
): ApiOrganizationGetList {
  return {
    id: organization.id,
    title: organization.title,
  };
}

import { ApiOrganizationGetList } from "need4deed-sdk";
import { dataSource } from "../../../data/data-source";
import Organization from "../../../data/entity/organization.entity";
import { dtoOrganizationGetList } from "../../../services/dto/dto-organization";

export async function listOrganizations(): Promise<ApiOrganizationGetList[]> {
  const organizations = await dataSource
    .getRepository(Organization)
    .find({ order: { title: "ASC" } });
  return organizations.map(dtoOrganizationGetList);
}

import { ApiOrganizationPatch } from "need4deed-sdk";
import { EntityManager } from "typeorm";
import { BadRequestError, ConflictError, NotFoundError } from "../../../config";
import { dataSource } from "../../../data/data-source";
import Organization from "../../../data/entity/organization.entity";
import {
  createAddress,
  patchAddress,
  resolveAddressPostcode,
} from "./for-routes";

type OrganizationColumns = Partial<
  Record<"title" | "website" | "email" | "phone", string | null> & {
    addressId: number | null;
  }
>;

const NULLABLE_COLUMNS = ["website", "email", "phone"] as const;

async function resolveAddressId(
  organization: Organization,
  street: string | null | undefined,
  postcode: string | null | undefined,
  manager: EntityManager,
): Promise<number | null> {
  if (!street && !postcode) {
    return null;
  }
  const postcodeData = await resolveAddressPostcode(
    postcode ?? undefined,
    manager,
  );
  const addressData = street ? { street } : {};
  if (organization.addressId) {
    if (
      !(await patchAddress(
        { id: organization.addressId, ...addressData },
        postcodeData,
        manager,
      ))
    ) {
      throw new BadRequestError(
        `Address (id=${organization.addressId}) not updated.`,
      );
    }
    return organization.addressId;
  }
  const address = await createAddress(addressData, postcodeData, manager);
  if (!address) {
    throw new BadRequestError(
      `Address for organization (id=${organization.id}) not created; a valid postcode is required.`,
    );
  }
  return address.id;
}

export async function patchOrganization(
  id: number,
  patch: ApiOrganizationPatch,
): Promise<void> {
  try {
    await dataSource.manager.transaction(async (manager) => {
      const repository = manager.getRepository(Organization);
      const organization = await repository.findOneBy({ id });
      if (!organization) {
        throw new NotFoundError(`Organization (id:${id}) not found.`);
      }

      const columns: OrganizationColumns = {};
      if (patch.title !== undefined) {
        columns.title = patch.title;
      }
      for (const key of NULLABLE_COLUMNS) {
        if (patch[key] !== undefined) {
          columns[key] = patch[key] || null;
        }
      }
      if (
        patch.addressStreet !== undefined ||
        patch.addressPostcode !== undefined
      ) {
        columns.addressId = await resolveAddressId(
          organization,
          patch.addressStreet,
          patch.addressPostcode,
          manager,
        );
      }

      if (Object.keys(columns).length) {
        await repository.update({ id }, columns as Partial<Organization>);
      }
    });
  } catch (err) {
    const e = err as { code?: string; detail?: string };
    if (e.code === "23505" && e.detail?.includes("title")) {
      throw new ConflictError(`Organization title "${patch.title}" is taken.`);
    }
    throw err;
  }
}

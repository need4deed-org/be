import { ApiOrganizationPatch } from "need4deed-sdk";
import { EntityManager } from "typeorm";
import { BadRequestError, ConflictError, NotFoundError } from "../../../config";
import { dataSource } from "../../../data/data-source";
import Address from "../../../data/entity/location/address.entity";
import Organization from "../../../data/entity/organization.entity";
import { resolveAddressPostcode } from "./for-routes";

type OrganizationColumns = Partial<
  Record<"title" | "website" | "email" | "phone", string | null> & {
    addressId: number | null;
  }
>;

const NULLABLE_COLUMNS = ["website", "email", "phone"] as const;

async function isAddressShared(
  addressId: number,
  organizationId: number,
  manager: EntityManager,
): Promise<boolean> {
  const [{ shared }]: { shared: boolean }[] = await manager.query(
    `SELECT EXISTS (SELECT 1 FROM "agent" WHERE "address_id" = $1)
         OR EXISTS (SELECT 1 FROM "person" WHERE "address_id" = $1)
         OR EXISTS (SELECT 1 FROM "organization" WHERE "address_id" = $1 AND "id" <> $2)
       AS "shared"`,
    [addressId, organizationId],
  );
  return shared;
}

async function resolveAddressId(
  organization: Organization,
  patch: ApiOrganizationPatch,
  manager: EntityManager,
): Promise<number | null> {
  const clearsStreet = "addressStreet" in patch && !patch.addressStreet;
  const clearsPostcode = "addressPostcode" in patch && !patch.addressPostcode;
  if (clearsStreet && clearsPostcode) {
    return null;
  }
  if (clearsPostcode) {
    throw new BadRequestError(
      "An address needs a postcode; clear addressStreet and addressPostcode together to remove it.",
    );
  }

  const repository = manager.getRepository(Address);
  const current = organization.addressId
    ? await repository.findOneBy({ id: organization.addressId })
    : null;
  const street =
    patch.addressStreet !== undefined
      ? patch.addressStreet || null
      : (current?.street ?? null);
  const postcodeId = patch.addressPostcode
    ? (await resolveAddressPostcode(patch.addressPostcode, manager)).id
    : current?.postcodeId;
  if (!postcodeId) {
    throw new BadRequestError(
      `Address for organization (id=${organization.id}) not saved; a valid postcode is required.`,
    );
  }

  if (
    current &&
    !(await isAddressShared(current.id, organization.id, manager))
  ) {
    await repository.update({ id: current.id }, {
      street,
      postcodeId,
    } as Partial<Address>);
    return current.id;
  }
  const created = await repository.save(
    repository.create({
      street,
      city: current?.city,
      postcodeId,
    } as Partial<Address>),
  );
  return created.id;
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
          patch,
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

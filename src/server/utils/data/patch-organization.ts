import {
  ApiOrganizationPatch,
  EntityTableName,
  Lang,
  ORGANIZATION_ABOUT_MAX_LENGTH,
} from "need4deed-sdk";
import { EntityManager } from "typeorm";
import { BadRequestError, ConflictError, NotFoundError } from "../../../config";
import { dataSource } from "../../../data/data-source";
import Address from "../../../data/entity/location/address.entity";
import Organization from "../../../data/entity/organization.entity";
import { isUniqueViolation } from "../../../data/utils/is-unique-violation";
import { languageHint } from "../../../services/translation/language-hint";
import {
  enqueue,
  setOriginalLanguage,
} from "../../../services/translation/queue";
import { writeHumanTranslations } from "../../../services/translation/write";
import { assertMaxTextLength } from "../../../services/utils";
import { isAddressShared, resolveAddressPostcode } from "./for-routes";
import { languageIdOf } from "./request-language";

type OrganizationColumns = Partial<
  Record<"title" | "about" | "website" | "email" | "phone", string | null> & {
    addressId: number | null;
    originalLanguageId: number;
  }
>;

const NULLABLE_COLUMNS = ["website", "email", "phone"] as const;

async function resolveAddressId(
  organization: Organization,
  patch: ApiOrganizationPatch,
  manager: EntityManager,
): Promise<number | null> {
  const repository = manager.getRepository(Address);
  const current = organization.addressId
    ? await repository.findOne({
        where: { id: organization.addressId },
        lock: { mode: "pessimistic_write" },
      })
    : null;
  const clearsStreet = "addressStreet" in patch && !patch.addressStreet;
  const clearsPostcode = "addressPostcode" in patch && !patch.addressPostcode;
  if (
    (clearsStreet && clearsPostcode) ||
    (!current && !patch.addressStreet && !patch.addressPostcode)
  ) {
    if (
      current &&
      !(await isAddressShared(current.id, manager, {
        exceptOrganizationId: organization.id,
      }))
    ) {
      await manager
        .getRepository(Organization)
        .update({ id: organization.id }, {
          addressId: null,
        } as unknown as Partial<Organization>);
      await repository.delete({ id: current.id });
    }
    return null;
  }
  if (clearsPostcode) {
    throw new BadRequestError(
      "An address needs a postcode; clear addressStreet and addressPostcode together to remove it.",
    );
  }

  const street =
    patch.addressStreet !== undefined
      ? patch.addressStreet || null
      : (current?.street ?? null);
  const postcodeId = patch.addressPostcode
    ? (await resolveAddressPostcode(patch.addressPostcode, manager)).id
    : current?.postcodeId;
  const city =
    current && postcodeId === current.postcodeId ? current.city : null;
  if (!postcodeId) {
    throw new BadRequestError(
      `Address for organization (id=${organization.id}) not saved; a valid postcode is required.`,
    );
  }

  if (
    current &&
    !(await isAddressShared(current.id, manager, {
      exceptOrganizationId: organization.id,
    }))
  ) {
    await repository.update(
      { id: current.id },
      {
        street,
        city,
        postcodeId,
      },
    );
    return current.id;
  }
  const created = await repository.save(
    repository.create({
      street,
      city,
      postcodeId,
    }),
  );
  return created.id;
}

async function patchAbout(
  organization: Organization,
  about: string | null,
  lang: Lang | null,
  hasExplicitLanguage: boolean,
  manager: EntityManager,
): Promise<Pick<OrganizationColumns, "about" | "originalLanguageId"> | null> {
  const text = about?.trim() || null;
  const source = organization.about?.trim();
  if (source && lang) {
    const written = await writeHumanTranslations(
      manager,
      EntityTableName.ORGANIZATION,
      organization,
      lang,
      { about: text },
    );
    if (written !== null) {
      return null;
    }
  }
  assertMaxTextLength(
    "Träger about text",
    text,
    [organization.about],
    ORGANIZATION_ABOUT_MAX_LENGTH,
  );
  const detects =
    text &&
    !hasExplicitLanguage &&
    (!source || !organization.originalLanguageId);
  if (!detects) {
    return { about: text };
  }
  return {
    about: text,
    originalLanguageId: await languageIdOf(
      manager,
      languageHint(text) ?? lang ?? Lang.DE,
    ),
  };
}

export async function patchOrganization(
  id: number,
  patch: ApiOrganizationPatch,
  lang: Lang | null = null,
): Promise<void> {
  try {
    await dataSource.manager.transaction(async (manager) => {
      const repository = manager.getRepository(Organization);
      let organization = await repository.findOne({
        where: { id },
        lock: { mode: "pessimistic_write" },
      });
      if (!organization) {
        throw new NotFoundError(`Organization (id:${id}) not found.`);
      }
      if (patch.originalLanguage) {
        await setOriginalLanguage(
          manager,
          EntityTableName.ORGANIZATION,
          id,
          patch.originalLanguage,
        );
        organization = await repository.findOneByOrFail({ id });
      }

      const columns: OrganizationColumns = {};
      const aboutColumns =
        patch.about !== undefined
          ? await patchAbout(
              organization,
              patch.about,
              lang,
              Boolean(patch.originalLanguage),
              manager,
            )
          : null;
      Object.assign(columns, aboutColumns);
      if (patch.title !== undefined) {
        columns.title = patch.title.trim();
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
      if (aboutColumns) {
        await enqueue(
          manager,
          EntityTableName.ORGANIZATION,
          {
            id,
            originalLanguageId:
              aboutColumns.originalLanguageId ??
              organization.originalLanguageId,
          },
          { about: aboutColumns.about },
        );
      }
    });
  } catch (err) {
    if (
      isUniqueViolation(err) &&
      (err as { table?: string }).table === "organization" &&
      patch.title !== undefined
    ) {
      throw new ConflictError(`Organization title "${patch.title}" is taken.`);
    }
    throw err;
  }
}

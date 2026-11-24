import { ApiPersonPatch } from "need4deed-sdk";
import { EntityManager } from "typeorm";
import { BadRequestError } from "../../../config";
import Address from "../../../data/entity/location/address.entity";
import Postcode from "../../../data/entity/location/postcode.entity";
import Person from "../../../data/entity/person.entity";
import { getRepository } from "../../../data/utils";
import {
  createAddress,
  patchOrReplaceAddress,
  resolveAddressPostcode,
} from "./for-routes";

type SdkPersonAddressPatch = NonNullable<ApiPersonPatch["address"]>;
type PersonAddressPatch = Omit<SdkPersonAddressPatch, "postcode"> & {
  postcode?: Partial<NonNullable<SdkPersonAddressPatch["postcode"]>>;
};

async function resolvePostcode(
  postcode: PersonAddressPatch["postcode"],
  manager: EntityManager,
): Promise<Partial<Postcode>> {
  if (postcode?.id) {
    const known = await getRepository(manager, Postcode).existsBy({
      id: postcode.id,
    });
    if (!known) {
      throw new BadRequestError("Address not saved: unknown postcode.");
    }
    return { id: postcode.id };
  }
  return resolveAddressPostcode(postcode?.code, manager);
}

export async function updatePersonAddress(
  personId: number,
  address: PersonAddressPatch,
  manager: EntityManager,
): Promise<number | null> {
  const fields: Partial<Address> = {
    ...(address.street !== undefined && { street: address.street || null }),
    ...(address.city !== undefined && { city: address.city || null }),
  };

  const postcodeData = await resolvePostcode(address.postcode, manager);
  const person = await getRepository(manager, Person).findOneOrFail({
    where: { id: personId },
    lock: { mode: "pessimistic_write" },
  });

  if (person.addressId) {
    if (!Object.keys(fields).length && !postcodeData.id) {
      return person.addressId;
    }
    const addressId = await patchOrReplaceAddress(
      person.id,
      { id: person.addressId, ...fields },
      postcodeData,
      manager,
    );
    if (!addressId) {
      throw new BadRequestError("Address not saved.");
    }
    return addressId;
  }

  if (!fields.street && !fields.city && !postcodeData.id) {
    return null;
  }
  const created = await createAddress(fields, postcodeData, manager);
  if (!created) {
    throw new BadRequestError("Address not saved: a postcode is required.");
  }
  await getRepository(manager, Person).update(
    { id: person.id },
    { addressId: created.id },
  );
  return created.id;
}

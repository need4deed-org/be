import { ApiPersonPatch } from "need4deed-sdk";
import { BadRequestError } from "../../../config";
import { dataSource } from "../../../data/data-source";
import Address from "../../../data/entity/location/address.entity";
import Postcode from "../../../data/entity/location/postcode.entity";
import Person from "../../../data/entity/person.entity";
import { getRepository } from "../../../data/utils";
import { createAddress, patchOrReplaceAddress } from "./for-routes";

export async function updatePersonAddress(
  person: Person,
  address: NonNullable<ApiPersonPatch["address"]>,
): Promise<void> {
  const fields: Partial<Address> = {
    ...(address.street !== undefined && { street: address.street || null }),
    ...(address.city !== undefined && { city: address.city || null }),
  };
  const postcodeData: Partial<Postcode> = address.postcode?.id
    ? { id: address.postcode.id }
    : address.postcode?.code
      ? { value: address.postcode.code }
      : {};
  const sendsPostcode = Boolean(postcodeData.id || postcodeData.value);

  if (!Object.keys(fields).length && !sendsPostcode) {
    return;
  }

  await dataSource.transaction(async (manager) => {
    if (person.addressId) {
      const addressId = await patchOrReplaceAddress(
        person.id,
        { id: person.addressId, ...fields },
        postcodeData,
        manager,
      );
      if (!addressId) {
        throw new BadRequestError("Address not saved.");
      }
      return;
    }

    if (!fields.street && !fields.city && !sendsPostcode) {
      return;
    }
    const created = await createAddress(fields, postcodeData, manager);
    if (!created) {
      throw new BadRequestError("Address not saved: a postcode is required.");
    }
    await getRepository(manager, Person).update(
      { id: person.id },
      { addressId: created.id },
    );
  });
}

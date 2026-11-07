import { ApiOpportunityAddress, OpportunityType } from "need4deed-sdk";
import { BadRequestError } from "../../config";
import Address from "../../data/entity/location/address.entity";
import { getPostcode } from "../../data/utils/get-postcode";

export function assertAddressAllowedForType(
  type: OpportunityType,
  address: ApiOpportunityAddress | null | undefined,
): void {
  if (address && type === OpportunityType.ACCOMPANYING) {
    throw new BadRequestError(
      "An accompanying opportunity takes its location from the appointment, not an address.",
    );
  }
}

// An opportunity's own address (be#1291): the postcode is found or created,
// German postcodes only.
export async function parseOpportunityAddress(
  input: ApiOpportunityAddress,
): Promise<{ street: string; city: string; postcodeId: number }> {
  const street = input.street.trim();
  const city = input.city.trim();
  if (!street || !city) {
    throw new BadRequestError("The address needs a street and a city.");
  }
  const postcode = await getPostcode(input.postcode, {
    createOnlyGerman: true,
  });
  if (!postcode) {
    throw new BadRequestError(
      `"${input.postcode}" is not a valid German postcode.`,
    );
  }
  return { street, city, postcodeId: postcode.id };
}

export async function newOpportunityAddress(
  input: ApiOpportunityAddress,
): Promise<Address> {
  return new Address(await parseOpportunityAddress(input));
}

import { ApiOpportunityAddress, OpportunityType } from "need4deed-sdk";
import { BadRequestError } from "../../config";
import Address from "../../data/entity/location/address.entity";
import { getPostcode, normalizePostcode } from "../../data/utils/get-postcode";
import { isValidPLZ } from "../../data/utils/is-valid-plz";

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

export async function parseOpportunityAddress(
  input: ApiOpportunityAddress,
): Promise<{ street: string; city: string; postcodeId: number }> {
  const street = input.street.trim();
  const city = input.city.trim();
  if (!street || !city) {
    throw new BadRequestError("The address needs a street and a city.");
  }
  const postcode = isValidPLZ(normalizePostcode(input.postcode))
    ? await getPostcode(input.postcode)
    : null;
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

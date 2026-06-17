import Address from "../../data/entity/location/address.entity";

export function serializeAddress(address: Address): string {
  if (!(address && typeof address === "object")) {
    return "";
  }
  const postcodeCity = [address.postcode?.value, address.city].filter(Boolean).join(" ");
  return [address.street, postcodeCity].filter(Boolean).join(", ");
}

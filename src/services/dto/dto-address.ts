import Address from "../../data/entity/location/address.entity";

export function serializeAddress(address: Address): string {
  if (!(address && typeof address === "object")) {
    return "Berlin";
  }
  const postcodeCity = [
    address.postcode?.value,
    address.city ? address.city : "Berlin",
  ]
    .filter(Boolean)
    .join(" ");
  return address
    ? [address.street, postcodeCity].filter(Boolean).join(", ")
    : "Berlin";
}

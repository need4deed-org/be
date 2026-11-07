import { GermanCity } from "../types";

export function isValidPLZ(plz: string, city?: string) {
  if (!/^\d{5}$/.test(plz)) {
    return false;
  }
  const code = Number(plz);

  if (!city) {
    return code >= 1067 && code <= 99998;
  }

  switch (city) {
    case GermanCity.BERLIN:
      return code >= 10115 && code <= 14199;
    case GermanCity.POTSDAM:
      return code >= 14467 && code <= 14482;
    default:
      return false;
  }
}

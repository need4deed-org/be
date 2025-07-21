import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";

import { Country, GermanCity } from "../../data/types";

// this will go to sdk
function isValidPLZ(plz: string, city?: string) {
  const code = Number(plz);
  if (isNaN(code)) {
    return false;
  }

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

function isPostcodeInAllowedAreas(
  postcode: string,
  countryCode,
  allowedAreas?: string[],
): boolean {
  switch (countryCode) {
    case Country.DE:
      return allowedAreas?.length
        ? allowedAreas.some((area) => isValidPLZ(postcode, area))
        : isValidPLZ(postcode);
    default:
      return false;
  }
}

@ValidatorConstraint({ async: false }) // 'async: true' if your validation involves asynchronous operations (e.g., database lookups)
export class IsGermanPostcodeConstraint
  implements ValidatorConstraintInterface
{
  /**
   * This method contains the core validation logic.
   * It returns true if the value is valid, false otherwise.
   * @param value The value of the property being validated.
   * @param args Contains information about the validation (e.g., object, property name).
   */
  validate(code: string, args: ValidationArguments) {
    const [countryCode, allowedAreas] = args.constraints as [
      string,
      string[] | undefined,
    ];

    return isPostcodeInAllowedAreas(code, countryCode, allowedAreas);
  }

  /**
   * This method returns the default error message if validation fails.
   * You can customize the message based on the validation arguments.
   * @param args Contains information about the validation.
   */
  defaultMessage(args: ValidationArguments) {
    return `${args.property} is not a valid postcode.`;
  }
}

export function IsPostcode(
  countryCode: string,
  allowedAreas?: string[],
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions, // Pass any options provided by the user
      constraints: [countryCode, allowedAreas],
      validator: IsGermanPostcodeConstraint,
    });
  };
}

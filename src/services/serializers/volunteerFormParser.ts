import { VolunteerFormData } from "need4deed-sdk";

import Address from "../../data/entity/location/address.entity";
import Person from "../../data/entity/person.entity";
import Volunteer from "../../data/entity/volunteer/volunteer.entity";
import { getNameFields } from "../../data/utils";
import { getPostcode } from "../../server/utils";
import { dealParser } from "./dealParser";

export async function volunteerFormParser(
  formData: VolunteerFormData,
): Promise<Volunteer> {
  if (!formData) {
    throw new Error("No form data provided");
  }

  // postcode & address
  const postcode = await getPostcode(String(formData.postcode));
  const address = new Address({ postcode });

  // person
  const person = new Person({
    ...getNameFields(formData),
    email: formData.email,
    phone: formData.phone,
    address,
  });

  // deal
  const deal = await dealParser(formData);

  // volunteer
  const info = formData.comments || "";
  const statusVaccination = formData.measlesVaccination;
  const statusCGC = formData.goodConductCertificate;
  const volunteer = new Volunteer({
    info,
    person,
    deal,
    statusVaccination,
    statusCGC,
  });

  return volunteer;
}

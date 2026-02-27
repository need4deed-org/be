import { VolunteerFormData } from "need4deed-sdk";
import Address from "../../data/entity/location/address.entity";
import Person from "../../data/entity/person.entity";
import Volunteer from "../../data/entity/volunteer/volunteer.entity";
import { getPostcode } from "../../server/utils";
import { dealParser } from "./parser-deal";
import { getNameFields } from "./utils";

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
    ...getNameFields(formData.fullName),
    email: formData.email,
    phone: formData.phone,
    address,
  });

  // deal
  const deal = await dealParser(formData);

  // volunteer
  const infoAbout = formData.comments || "";
  const statusVaccination = formData.measlesVaccination;
  const statusCGC = formData.goodConductCertificate;
  const volunteer = new Volunteer({
    infoAbout,
    person,
    deal,
    statusVaccination,
    statusCGC,
  });

  return volunteer;
}

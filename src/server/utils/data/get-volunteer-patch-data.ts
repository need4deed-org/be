import { VolunteerPatchBodyData } from "need4deed-sdk";
import Address from "../../../data/entity/location/address.entity";
import Postcode from "../../../data/entity/location/postcode.entity";
import Person from "../../../data/entity/person.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import {
  getEmptyPropsNull,
  getNullFromEmptyArray,
  stripNullishAttributes,
} from "../common";

export function getVolunteerPatchData(
  body: VolunteerPatchBodyData,
  nullable?: Array<keyof VolunteerPatchBodyData>,
) {
  const volunteerData: Partial<Volunteer> = stripNullishAttributes(
    {
      infoAbout: body.infoAbout,
      infoExperience: body.infoExperience,
      statusCGC: body.goodConductCertificate,
      statusVaccination: body.measlesVaccination,
      statusEngagement: body.statusEngagement,
      statusCommunication: body.statusCommunication,
      statusAppreciation: body.statusAppreciation,
      statusType: body.statusType,
      statusMatch: body.statusMatch,
      statusCgcProcess: body.statusCgcProcess,
      dateReturn: body.dateReturn,
      preferredCommunicationType: body.preferredCommunicationType,
    },
    nullable,
  );
  const personData: Partial<Person> = stripNullishAttributes(
    {
      id: body.person?.id,
      firstName: body.person?.firstName,
      lastName: body.person?.lastName,
      middleName: body.person?.middleName,
      email: body.person?.email,
      phone: body.person?.phone,
    },
    nullable,
  );
  const comments = body.comments;
  const addressData: Partial<Address> = stripNullishAttributes(
    {
      id: body.person?.address?.id,
      street: body.person?.address?.street,
      city: body.person?.address?.city,
    },
    nullable,
  );
  const postcodeData: Partial<Postcode> = stripNullishAttributes(
    {
      id: body.person?.address?.postcode?.id,
      value: body.person?.address?.postcode?.code,
    },
    nullable,
  );

  return {
    ...getEmptyPropsNull({
      volunteerData,
      personData,
      comments,
      addressData,
      postcodeData,
    }),
    languages: getNullFromEmptyArray(body.languages),
    availability: getNullFromEmptyArray(body.availability),
    activities: getNullFromEmptyArray(body.activities),
    skills: getNullFromEmptyArray(body.skills),
    locations: getNullFromEmptyArray(body.locations),
  };
}

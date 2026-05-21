import { DocumentStatusType, VolunteerPatchBodyData } from "need4deed-sdk";
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
  const statusDates: Partial<Volunteer> = {};
  if (body.goodConductCertificate === DocumentStatusType.APPLIED_N4D) {
    statusDates.statusCGCApplicationDate = new Date();
  } else if (body.goodConductCertificate === DocumentStatusType.YES) {
    statusDates.statusCGCDate = new Date();
  } else if (body.goodConductCertificate === DocumentStatusType.NO) {
    statusDates.statusCGCDate = null;
    statusDates.statusCGCApplicationDate = null;
  }
  if (body.measlesVaccination === DocumentStatusType.YES) {
    statusDates.statusVaccinationDate = new Date();
  } else if (body.measlesVaccination === DocumentStatusType.NO) {
    statusDates.statusVaccinationDate = null;
  }

  const volunteerData: Partial<Volunteer> = {
    ...stripNullishAttributes(
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
    ),
    ...statusDates,
  };
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

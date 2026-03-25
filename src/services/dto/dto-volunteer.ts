import {
  Address,
  ApiPersonGet,
  ApiVolunteerGet,
  ApiVolunteerGetList,
  TimedText,
} from "need4deed-sdk";
import Comment from "../../data/entity/comment.entity";
import Timeline from "../../data/entity/timeline.entity";
import Volunteer from "../../data/entity/volunteer/volunteer.entity";
import {
  getAvailability,
  getLanguages,
  getOptionItems,
  getTitles,
} from "./utils";

const city = "Berlin";

export function volunteerListSerializer(
  volunteer: Volunteer,
): ApiVolunteerGetList {
  try {
    const id = volunteer.id;
    const statusEngagement = volunteer.statusEngagement;
    const statusType = volunteer.statusType;
    const name = volunteer.person.name;
    const avatarUrl = volunteer.person?.avatarUrl || null;
    const languages = getLanguages(volunteer.deal.profile.profileLanguage);
    const availability = getAvailability(volunteer.deal.time?.timeTimeslot);
    const activities = getTitles(
      volunteer.deal.profile.profileActivity,
      "activity",
    );
    const skills = getTitles(volunteer.deal.profile.profileSkill, "skill");
    const locations = getTitles(
      volunteer.deal.location?.locationDistrict,
      "district",
    );

    return {
      id,
      statusEngagement,
      statusType,
      name,
      avatarUrl,
      languages,
      availability,
      activities,
      skills,
      locations,
    };
  } catch (error) {
    console.error(`Error serializing volunteer (id:${volunteer.id}): ${error}`);
  }
}

export function volunteerSerializer(
  volunteer: Volunteer,
  volunteerComments: Comment[],
  timedEvents: Timeline[],
): ApiVolunteerGet {
  const address: Address | null = volunteer.person.address
    ? {
        ...volunteer.person.address,
        id: volunteer.person.address.id,
        city,
        postcode: {
          ...volunteer.person.address.postcode,
          id: volunteer.person.address.postcode.id,
          code: volunteer.person.address.postcode.value,
          latitude: volunteer.person.address.postcode.latitude || null,
          longitude: volunteer.person.address.postcode.longitude || null,
        },
      }
    : null;

  const comments: TimedText[] = volunteerComments.map((comment) => ({
    id: comment.id,
    timestamp: comment.updatedAt,
    content: comment.text,
    authorName: comment.user.person.name,
  }));

  const timelineLogs: TimedText[] = timedEvents.map(
    ({ id, timestamp, content }) => ({
      id,
      timestamp,
      content,
      authorName: "", // TODO: add author field to timeline logs
    }),
  );
  const person: ApiPersonGet = {
    id: volunteer.person.id,
    email: volunteer.person.email,
    firstName: volunteer.person.firstName,
    lastName: volunteer.person.lastName,
    middleName: volunteer.person.middleName,
    phone: volunteer.person.phone,
    landline: volunteer.person.landline,
    avatarUrl: volunteer.person?.avatarUrl || null,
    address,
  };
  const preferredCommunicationType = volunteer.preferredCommunicationType;
  const goodConductCertificate = volunteer.statusCGC;
  const infoAbout = volunteer.infoAbout;
  const infoExperience = volunteer.infoExperience;
  const measlesVaccination = volunteer.statusVaccination;
  const opportunities = [];
  const opportunitiesApplied = [];
  const opportunitiesMatched = [];
  const createdAt = volunteer.createdAt;
  const updatedAt = volunteer.updatedAt;
  const activities = getOptionItems(
    volunteer.deal.profile.profileActivity,
    "activity",
  );
  const skills = getOptionItems(volunteer.deal.profile.profileSkill, "skill");
  const locations = getOptionItems(
    volunteer.deal.location.locationDistrict,
    "district",
  );

  const languages = getLanguages(volunteer.deal.profile.profileLanguage);
  const availability = getAvailability(volunteer.deal.time.timeTimeslot);

  return {
    id: volunteer.id,
    person,
    statusEngagement: volunteer.statusEngagement,
    statusCommunication: volunteer.statusCommunication,
    statusAppreciation: volunteer.statusAppreciation,
    statusType: volunteer.statusType,
    statusMatch: volunteer.statusMatch,
    statusCgcProcess: volunteer.statusCgcProcess,
    dateReturn: volunteer.dateReturn,
    preferredCommunicationType,
    comments,
    goodConductCertificate,
    infoAbout,
    infoExperience,
    measlesVaccination,
    opportunities,
    opportunitiesApplied,
    opportunitiesMatched,
    timelineLogs,
    createdAt,
    updatedAt,
    languages,
    availability,
    activities,
    skills,
    locations,
  };
}

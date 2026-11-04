import { VolunteerListType } from "../../types";

const listRelationsCommon = [
  "person",
  "deal",
  "deal.dealLanguage.language",
  "deal.dealDistrict.district",
];
const listRelationsCardExtra = [
  "deal.dealActivity.activity",
  "deal.dealSkill.skill",
  "deal.dealTimeslot.timeslot",
  "person.address.postcode",
];

export const volunteerListRelations = (listType: VolunteerListType) =>
  listType === "table"
    ? listRelationsCommon
    : [...listRelationsCommon, ...listRelationsCardExtra];

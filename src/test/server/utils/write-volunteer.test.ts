import { beforeEach, describe, expect, it, vi } from "vitest";
import Deal from "../../../data/entity/deal.entity";
import Address from "../../../data/entity/location/address.entity";
import Location from "../../../data/entity/location/location.entity";
import LocationDistrict from "../../../data/entity/m2m/location-district";
import ProfileActivity from "../../../data/entity/m2m/profile-activity";
import ProfileLanguage from "../../../data/entity/m2m/profile-language";
import ProfileSkill from "../../../data/entity/m2m/profile-skill";
import TimeTimeslot from "../../../data/entity/m2m/time-timeslot";
import Person from "../../../data/entity/person.entity";
import Profile from "../../../data/entity/profile/profile.entity";
import Time from "../../../data/entity/time/time.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { writeVolunteerLegacy } from "../../../server/utils/data";

const txnManager: any = { getRepository: vi.fn() };

vi.mock("../../../data/data-source", () => ({
  dataSource: {
    manager: {
      transaction: async (cb: any) => cb(txnManager),
    },
  },
}));

describe("writeVolunteer", () => {
  const addrSave = vi.fn();
  const personSave = vi.fn();
  const profileSave = vi.fn();
  const profileActivitySave = vi.fn();
  const profileSkillSave = vi.fn();
  const profileLanguageSave = vi.fn();
  const timeSave = vi.fn();
  const timeTimeslotSave = vi.fn();
  const locationSave = vi.fn();
  const locationDistrictSave = vi.fn();
  const dealSave = vi.fn();
  const volunteerSave = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();

    txnManager.getRepository.mockImplementation((entity: any) => {
      switch (entity) {
        case Address:
          return { save: addrSave };
        case Person:
          return { save: personSave };
        case Profile:
          return { save: profileSave };
        case ProfileActivity:
          return { save: profileActivitySave };
        case ProfileSkill:
          return { save: profileSkillSave };
        case ProfileLanguage:
          return { save: profileLanguageSave };
        case Time:
          return { save: timeSave };
        case TimeTimeslot:
          return { save: timeTimeslotSave };
        case Location:
          return { save: locationSave };
        case LocationDistrict:
          return { save: locationDistrictSave };
        case Deal:
          return { save: dealSave };
        case Volunteer:
          return { save: volunteerSave };
        default:
          return { save: vi.fn() };
      }
    });

    addrSave.mockImplementation(async (o: any) => ((o.id = 11), o));
    personSave.mockImplementation(async (o: any) => ((o.id = 22), o));
    profileSave.mockImplementation(async (o: any) => ((o.id = 33), o));
    profileActivitySave.mockImplementation(async (arr: any[]) => {
      arr.forEach((it, i) => (it.id = 100 + i));
      return arr;
    });
    profileSkillSave.mockImplementation(async (arr: any[]) => {
      arr.forEach((it, i) => (it.id = 200 + i));
      return arr;
    });
    profileLanguageSave.mockImplementation(async (arr: any[]) => {
      arr.forEach((it, i) => (it.id = 300 + i));
      return arr;
    });
    timeSave.mockImplementation(async (o: any) => ((o.id = 44), o));
    timeTimeslotSave.mockImplementation(async (arr: any[]) => {
      arr.forEach((it, i) => (it.id = 400 + i));
      return arr;
    });
    locationSave.mockImplementation(async (o: any) => ((o.id = 55), o));
    locationDistrictSave.mockImplementation(async (arr: any[]) => {
      arr.forEach((it, i) => (it.id = 500 + i));
      return arr;
    });
    dealSave.mockImplementation(async (o: any) => ((o.id = 66), o));
    volunteerSave.mockImplementation(async (o: any) => ((o.id = 77), o));
  });

  it("saves nested entities in a transaction and returns volunteer id", async () => {
    const volunteer: any = {
      id: undefined,
      person: { id: undefined, address: { id: undefined, street: "s" } },
      deal: {
        id: undefined,
        profile: {
          id: undefined,
          profileActivity: [{}, {}],
          profileSkill: [{}, {}],
          profileLanguage: [{}, {}],
        },
        time: { id: undefined, timeTimeslot: [{}, {}] },
        location: { id: undefined, locationDistrict: [{}, {}] },
      },
    };

    const result = await writeVolunteerLegacy(volunteer as Volunteer);

    expect(addrSave).toHaveBeenCalledWith(volunteer.person.address);
    expect(personSave).toHaveBeenCalledWith(volunteer.person);
    expect(profileSave).toHaveBeenCalledWith(volunteer.deal.profile);
    expect(profileActivitySave).toHaveBeenCalledWith(
      volunteer.deal.profile.profileActivity,
    );
    expect(profileSkillSave).toHaveBeenCalledWith(
      volunteer.deal.profile.profileSkill,
    );
    expect(profileLanguageSave).toHaveBeenCalledWith(
      volunteer.deal.profile.profileLanguage,
    );
    expect(timeSave).toHaveBeenCalledWith(volunteer.deal.time);
    expect(timeTimeslotSave).toHaveBeenCalledWith(
      volunteer.deal.time.timeTimeslot,
    );
    expect(locationSave).toHaveBeenCalledWith(volunteer.deal.location);
    expect(locationDistrictSave).toHaveBeenCalledWith(
      volunteer.deal.location.locationDistrict,
    );
    expect(dealSave).toHaveBeenCalledWith(volunteer.deal);
    expect(volunteerSave).toHaveBeenCalledWith(volunteer);

    expect(result).toBe(77);
    expect(volunteer.id).toBe(77);

    // ensure m2m propagation happened
    expect(volunteer.deal.profile.profileActivity[0].profileId).toBe(33);
    expect(volunteer.deal.time.timeTimeslot[0].timeId).toBe(44);
    expect(volunteer.deal.location.locationDistrict[0].locationId).toBe(55);
  });

  it("propagates repository error from a nested save", async () => {
    // make profileActivity save fail
    profileActivitySave.mockRejectedValueOnce(new Error("m2m failed"));

    const volunteer: any = {
      id: undefined,
      person: { id: undefined, address: { id: undefined } },
      deal: {
        id: undefined,
        profile: {
          id: undefined,
          profileActivity: [{}],
          profileSkill: [],
          profileLanguage: [],
        },
        time: { id: undefined, timeTimeslot: [] },
        location: { id: undefined, locationDistrict: [] },
      },
    };

    await expect(writeVolunteerLegacy(volunteer as Volunteer)).rejects.toThrow(
      "m2m failed",
    );

    // profile id should still have been set before trying to save m2m
    expect(volunteer.deal.profile.id).toBe(33);
    expect(volunteer.deal.profile.profileActivity[0].profileId).toBe(33);
  });
});

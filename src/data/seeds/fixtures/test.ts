import {
  AgentRoleType,
  DocumentStatusType,
  LangProficiency,
  OpportunityType,
  OpportunityVolunteerStatusType,
  UserRole,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import { DataSource } from "typeorm";
import logger from "../../../logger";
import Deal from "../../entity/deal.entity";
import Address from "../../entity/location/address.entity";
import District from "../../entity/location/district.entity";
import Postcode from "../../entity/location/postcode.entity";
import AgentPerson from "../../entity/m2m/agent-person";
import AgentPostcode from "../../entity/m2m/agent-postcode";
import DealActivity from "../../entity/m2m/deal-activity";
import DealDistrict from "../../entity/m2m/deal-district";
import DealLanguage from "../../entity/m2m/deal-language";
import DealSkill from "../../entity/m2m/deal-skill";
import DealTimeslot from "../../entity/m2m/deal-timeslot";
import OpportunityVolunteer from "../../entity/m2m/opportunity-volunteer";
import Accompanying from "../../entity/opportunity/accompanying.entity";
import Agent from "../../entity/opportunity/agent.entity";
import Opportunity from "../../entity/opportunity/opportunity.entity";
import Organization from "../../entity/organization.entity";
import Person from "../../entity/person.entity";
import Activity from "../../entity/profile/activity.entity";
import Language from "../../entity/profile/language.entity";
import Skill from "../../entity/profile/skill.entity";
import Timeslot from "../../entity/time/timeslot.entity";
import User from "../../entity/user.entity";
import Volunteer from "../../entity/volunteer/volunteer.entity";
import { DealType } from "../../types";
import { getRepository, hashPassword } from "../../utils";

export const TEST_EMAILS = {
  admin: "admin@test.need4deed.org",
  coordinator: "coordinator@test.need4deed.org",
  agentUser: "agent@test.need4deed.org",
  volunteerUser: "volunteer@test.need4deed.org",
};

function makeEventTimeslot(
  date: Date,
  startHour: number,
  endHour: number,
): Partial<Timeslot> {
  const start = new Date(date);
  start.setHours(startHour, 0, 0, 0);
  const end = new Date(date);
  end.setHours(endHour, 0, 0, 0);
  return { start, end };
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function makeDeal(
  dataSource: DataSource,
  type: DealType,
  postcodeId: number,
  opts: {
    activityIds?: number[];
    skillIds?: number[];
    languages?: Array<{ languageId: number; proficiency: LangProficiency }>;
    timeslotIds?: number[];
    districtIds?: number[];
  } = {},
): Promise<Deal> {
  const dealRepo = getRepository(dataSource, Deal);
  const deal = await dealRepo.save(new Deal({ type, postcodeId }));

  if (opts.activityIds?.length) {
    const repo = getRepository(dataSource, DealActivity);
    for (const activityId of opts.activityIds) {
      await repo.save(new DealActivity({ dealId: deal.id, activityId }));
    }
  }
  if (opts.skillIds?.length) {
    const repo = getRepository(dataSource, DealSkill);
    for (const skillId of opts.skillIds) {
      await repo.save(new DealSkill({ dealId: deal.id, skillId }));
    }
  }
  if (opts.languages?.length) {
    const repo = getRepository(dataSource, DealLanguage);
    for (const { languageId, proficiency } of opts.languages) {
      await repo.save(
        new DealLanguage({ dealId: deal.id, languageId, proficiency }),
      );
    }
  }
  if (opts.timeslotIds?.length) {
    const repo = getRepository(dataSource, DealTimeslot);
    for (const timeslotId of opts.timeslotIds) {
      await repo.save(new DealTimeslot({ dealId: deal.id, timeslotId }));
    }
  }
  if (opts.districtIds?.length) {
    const repo = getRepository(dataSource, DealDistrict);
    for (const districtId of opts.districtIds) {
      await repo.save(new DealDistrict({ dealId: deal.id, districtId }));
    }
  }

  return deal;
}

export async function seedTestFixtures(dataSource: DataSource): Promise<void> {
  const userRepo = getRepository(dataSource, User);

  const existing = await userRepo.findOneBy({ email: TEST_EMAILS.admin });
  if (existing) {
    logger.info("Skipping test fixtures — already seeded.");
    return;
  }

  // --- reference lookups ---
  const postcodeRepo = getRepository(dataSource, Postcode);
  const languageRepo = getRepository(dataSource, Language);
  const activityRepo = getRepository(dataSource, Activity);
  const skillRepo = getRepository(dataSource, Skill);
  const districtRepo = getRepository(dataSource, District);
  const timeslotRepo = getRepository(dataSource, Timeslot);

  const [pc10115, pc12043, pc13347] = await Promise.all([
    postcodeRepo.findOneByOrFail({ value: "10115" }),
    postcodeRepo.findOneByOrFail({ value: "12043" }),
    postcodeRepo.findOneByOrFail({ value: "13347" }),
  ]);
  const [langDe, langEn, langAr] = await Promise.all([
    languageRepo.findOneByOrFail({ isoCode: "de" }),
    languageRepo.findOneByOrFail({ isoCode: "en" }),
    languageRepo.findOneByOrFail({ isoCode: "ar" }),
  ]);
  const [actLangCafe, actTranslation, actDaycare, actSports] =
    await Promise.all([
      activityRepo.findOneByOrFail({ title: "Language café" }),
      activityRepo.findOneByOrFail({ title: "Translation" }),
      activityRepo.findOneByOrFail({ title: "Daycare" }),
      activityRepo.findOneByOrFail({ title: "Sports" }),
    ]);
  const [skillDrawing, skillPainting] = await Promise.all([
    skillRepo.findOneByOrFail({ title: "Drawing" }),
    skillRepo.findOneByOrFail({ title: "Painting" }),
  ]);
  const [distMitte, distNeukoelln] = await Promise.all([
    districtRepo.findOneByOrFail({ title: "Mitte" }),
    districtRepo.findOneByOrFail({ title: "Neukölln" }),
  ]);
  const [tsMoMorning, tsWeeMorning, tsFriNoon, tsTueAfternoon] =
    await Promise.all([
      timeslotRepo.findOneByOrFail({ info: "MO-morning" }),
      timeslotRepo.findOneByOrFail({ info: "WE-morning" }),
      timeslotRepo.findOneByOrFail({ info: "FR-noon" }),
      timeslotRepo.findOneByOrFail({ info: "TU-afternoon" }),
    ]);

  // --- users ---
  const pwHash = await hashPassword("test_password");

  const adminPerson = new Person({ firstName: "Test", lastName: "Admin" });
  const userAdmin = new User({
    email: TEST_EMAILS.admin,
    password: pwHash,
    role: UserRole.ADMIN,
    isActive: true,
    person: adminPerson,
  });

  const coordinatorPerson = new Person({
    firstName: "Test",
    lastName: "Coordinator",
  });
  const userCoordinator = new User({
    email: TEST_EMAILS.coordinator,
    password: pwHash,
    role: UserRole.COORDINATOR,
    isActive: true,
    person: coordinatorPerson,
  });

  const agentContactPerson = new Person({
    firstName: "Test",
    lastName: "AgentContact",
    email: TEST_EMAILS.agentUser,
  });
  const userAgentUser = new User({
    email: TEST_EMAILS.agentUser,
    password: pwHash,
    role: UserRole.USER,
    isActive: true,
    person: agentContactPerson,
  });

  const vol1Person = new Person({
    firstName: "Test",
    lastName: "Volunteer",
    email: TEST_EMAILS.volunteerUser,
  });
  const userVolunteerUser = new User({
    email: TEST_EMAILS.volunteerUser,
    password: pwHash,
    role: UserRole.USER,
    isActive: true,
    person: vol1Person,
  });

  await userRepo.save([
    userAdmin,
    userCoordinator,
    userAgentUser,
    userVolunteerUser,
  ]);

  // reload persons with their generated IDs (cascaded by User save)
  const personAgentContact = userAgentUser.person;
  const personVol1 = userVolunteerUser.person;

  // --- agents ---
  const addressRepo = getRepository(dataSource, Address);
  const orgRepo = getRepository(dataSource, Organization);
  const agentRepo = getRepository(dataSource, Agent);
  const agentPersonRepo = getRepository(dataSource, AgentPerson);
  const agentPostcodeRepo = getRepository(dataSource, AgentPostcode);
  const personRepo = getRepository(dataSource, Person);

  // Agent 1
  const address1 = await addressRepo.save(
    new Address({ title: "Test RAB HQ", postcodeId: pc10115.id }),
  );
  const org1 = await orgRepo.save(
    new Organization({
      title: "Test RAB Org",
      addressId: address1.id,
      personId: personAgentContact.id,
    }),
  );
  const agent1 = await agentRepo.save(
    new Agent({ title: "Test RAB", organizationId: org1.id }),
  );
  await agentPersonRepo.save(
    new AgentPerson({
      agentId: agent1.id,
      personId: personAgentContact.id,
      role: AgentRoleType.VOLUNTEER_COORDINATOR,
    }),
  );
  await agentPostcodeRepo.save(
    new AgentPostcode({ agentId: agent1.id, postcodeId: pc10115.id }),
  );

  // Agent 2
  const agent2ContactPerson = await personRepo.save(
    new Person({ firstName: "Test", lastName: "Agent2Contact" }),
  );
  const address2 = await addressRepo.save(
    new Address({ title: "Test WiB HQ", postcodeId: pc12043.id }),
  );
  const org2 = await orgRepo.save(
    new Organization({
      title: "Test WiB Org",
      addressId: address2.id,
      personId: agent2ContactPerson.id,
    }),
  );
  const agent2 = await agentRepo.save(
    new Agent({ title: "Test WiB", organizationId: org2.id }),
  );
  await agentPersonRepo.save(
    new AgentPerson({
      agentId: agent2.id,
      personId: agent2ContactPerson.id,
      role: AgentRoleType.OTHER,
    }),
  );
  await agentPostcodeRepo.save(
    new AgentPostcode({ agentId: agent2.id, postcodeId: pc12043.id }),
  );

  // --- volunteers ---
  const volunteerRepo = getRepository(dataSource, Volunteer);

  const deal1 = await makeDeal(dataSource, DealType.VOLUNTEER, pc10115.id, {
    activityIds: [actLangCafe.id],
    skillIds: [skillDrawing.id],
    languages: [
      { languageId: langDe.id, proficiency: LangProficiency.ADVANCED },
      { languageId: langEn.id, proficiency: LangProficiency.INTERMEDIATE },
    ],
    timeslotIds: [tsMoMorning.id, tsWeeMorning.id],
    districtIds: [distMitte.id],
  });
  const volunteer1 = await volunteerRepo.save(
    new Volunteer({
      person: personVol1,
      deal: deal1,
      statusEngagement: VolunteerStateEngagementType.ACTIVE,
      statusCGC: DocumentStatusType.YES,
      statusVaccination: DocumentStatusType.YES,
      infoAbout: "Test volunteer 1 — enjoys language exchange.",
      infoExperience: "Tutoring 2 years.",
    }),
  );

  const personVol2 = await personRepo.save(
    new Person({ firstName: "Maria", lastName: "Schmidt" }),
  );
  const deal2 = await makeDeal(dataSource, DealType.VOLUNTEER, pc12043.id, {
    activityIds: [actDaycare.id],
    skillIds: [skillPainting.id],
    languages: [{ languageId: langDe.id, proficiency: LangProficiency.NATIVE }],
    timeslotIds: [tsTueAfternoon.id],
    districtIds: [distNeukoelln.id],
  });
  const volunteer2 = await volunteerRepo.save(
    new Volunteer({ person: personVol2, deal: deal2 }),
  );

  const personVol3 = await personRepo.save(
    new Person({ firstName: "Ahmet", lastName: "Yilmaz" }),
  );
  const deal3 = await makeDeal(dataSource, DealType.VOLUNTEER, pc13347.id, {
    activityIds: [actSports.id, actTranslation.id],
    languages: [
      { languageId: langAr.id, proficiency: LangProficiency.NATIVE },
      { languageId: langDe.id, proficiency: LangProficiency.BEGINNER },
    ],
    timeslotIds: [tsFriNoon.id],
    districtIds: [distMitte.id],
  });
  const volunteer3 = await volunteerRepo.save(
    new Volunteer({ person: personVol3, deal: deal3 }),
  );

  // --- opportunities ---
  const opportunityRepo = getRepository(dataSource, Opportunity);
  const accompanyingRepo = getRepository(dataSource, Accompanying);

  const oppDeal1 = await makeDeal(
    dataSource,
    DealType.OPPORTUNITY,
    pc10115.id,
    {
      activityIds: [actLangCafe.id],
      languages: [
        { languageId: langDe.id, proficiency: LangProficiency.ADVANCED },
      ],
      timeslotIds: [tsMoMorning.id, tsWeeMorning.id],
      districtIds: [distMitte.id],
    },
  );
  const opp1 = await opportunityRepo.save(
    new Opportunity({
      title: "Test Language Café",
      type: OpportunityType.REGULAR,
      agentId: agent1.id,
      deal: oppDeal1,
      numberVolunteers: 2,
    }),
  );

  const oppDeal2 = await makeDeal(
    dataSource,
    DealType.OPPORTUNITY,
    pc10115.id,
    {
      activityIds: [actSports.id],
      timeslotIds: [tsMoMorning.id],
      districtIds: [distMitte.id],
    },
  );
  const opp2 = await opportunityRepo.save(
    new Opportunity({
      title: "Test Sports Event",
      type: OpportunityType.EVENTS,
      agentId: agent1.id,
      deal: oppDeal2,
      numberVolunteers: 5,
    }),
  );

  const eventDate = daysFromNow(14);
  const accompanyingTimeslot = makeEventTimeslot(eventDate, 9, 12);
  const accompanying = await accompanyingRepo.save(
    new Accompanying({
      address: "Musterstraße 1, Berlin",
      name: "Test Appointment",
      date: accompanyingTimeslot.start,
      postcodeId: pc12043.id,
    }),
  );
  const oppDeal3 = await makeDeal(
    dataSource,
    DealType.OPPORTUNITY,
    pc12043.id,
    { activityIds: [actDaycare.id], districtIds: [distNeukoelln.id] },
  );
  const opp3 = await opportunityRepo.save(
    new Opportunity({
      title: "Test Accompanying Appointment",
      type: OpportunityType.ACCOMPANYING,
      agentId: agent2.id,
      deal: oppDeal3,
      accompanyingId: accompanying.id,
      numberVolunteers: 1,
    }),
  );

  const oppDeal4 = await makeDeal(
    dataSource,
    DealType.OPPORTUNITY,
    pc12043.id,
    {
      activityIds: [actTranslation.id],
      languages: [
        { languageId: langAr.id, proficiency: LangProficiency.NATIVE },
      ],
      districtIds: [distNeukoelln.id],
    },
  );
  await opportunityRepo.save(
    new Opportunity({
      title: "Test Translation Support",
      type: OpportunityType.REGULAR,
      agentId: agent2.id,
      deal: oppDeal4,
      numberVolunteers: 1,
    }),
  );

  // --- matches ---
  const ovRepo = getRepository(dataSource, OpportunityVolunteer);
  await ovRepo.save(
    new OpportunityVolunteer({
      opportunityId: opp1.id,
      volunteerId: volunteer1.id,
      status: OpportunityVolunteerStatusType.ACTIVE,
    }),
  );
  await ovRepo.save(
    new OpportunityVolunteer({
      opportunityId: opp3.id,
      volunteerId: volunteer2.id,
      status: OpportunityVolunteerStatusType.PENDING,
    }),
  );
  await ovRepo.save(
    new OpportunityVolunteer({
      opportunityId: opp2.id,
      volunteerId: volunteer3.id,
      status: OpportunityVolunteerStatusType.MATCHED,
    }),
  );

  logger.info("Test fixtures seeded.");
}

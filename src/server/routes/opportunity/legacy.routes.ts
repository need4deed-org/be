import {
  FastifyContextConfig,
  FastifyInstance,
  FastifyPluginOptions,
} from "fastify";
import {
  AgentRoleType,
  OpportunityLegacyFormData,
  OpportunityStatusType,
} from "need4deed-sdk";
import { In } from "typeorm";
import { dataSource } from "../../../data/data-source";
import Address from "../../../data/entity/location/address.entity";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import Comment from "../../../data/entity/comment.entity";
import logger from "../../../logger";
import {
  accompanyingParserOpportunity,
  parseFormData,
  parseOpportunityLegacy,
} from "../../../services";
import { dealParserOpportunity } from "../../../services/dto/parser-deal-opportunity";
import { getPostcode, getRepository } from "../../../data/utils";
import {
  getAgentByAddress,
  getDistrictToOpportunityHandler,
  getOpportunityNotificationText,
  getOpportunityOrphanageAgent,
  getOrCreateSubmitterPerson,
  writeOpportunityContactComment,
  writeOpportunityLegacy,
} from "../../utils";

function parseContactPerson(formData: OpportunityLegacyFormData): Person {
  const parts = (formData.rac_full_name ?? "").trim().split(/\s+/);
  return new Person({
    firstName: parts[0] || formData.rac_full_name || "Unknown",
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : undefined,
    email: formData.rac_email || undefined,
    phone: formData.rac_phone || undefined,
  });
}

async function findOrCreateAgent(
  formData: OpportunityLegacyFormData,
): Promise<Agent> {
  if (!formData.rac_address || !formData.rac_plz) {
    logger.warn("Legacy form missing rac_address or rac_plz — falling back to orphanage agent");
    return getOpportunityOrphanageAgent();
  }

  const agentRepository = getRepository(dataSource, Agent);
  const agents = await agentRepository.find({
    relations: ["address.postcode"],
  });

  const match = getAgentByAddress(agents, formData.rac_address, formData.rac_plz);
  if (match) return match;

  logger.info(
    `No agent found for address "${formData.rac_address}" ${formData.rac_plz} — creating new agent`,
  );

  const postcode = await getPostcode(formData.rac_plz);

  return dataSource.manager.transaction(async (em) => {
    const address = new Address({ street: formData.rac_address, postcodeId: postcode.id });
    await em.save(address);

    const person = parseContactPerson(formData);
    await em.save(person);

    const agent = new Agent({ title: formData.rac_address, addressId: address.id });
    await em.save(agent);

    await em.save(new AgentPerson({
      agentId: agent.id,
      personId: person.id,
      role: AgentRoleType.VOLUNTEER_COORDINATOR,
    }));

    return agent;
  });
}

export default async function opportunityLegacyRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.post<{ Body: OpportunityLegacyFormData }>(
    "/",
    { config: { public: true } as FastifyContextConfig },
    async (request, reply) => {
      const opportunity = await parseFormData(
        request.body,
        parseOpportunityLegacy,
      );

      opportunity.deal = await dealParserOpportunity(request.body);
      opportunity.accompanying =
        request.body.opportunity_type === "accompanying"
          ? await accompanyingParserOpportunity(request.body)
          : undefined;

      opportunity.agent = await findOrCreateAgent(request.body);

      const personRepository = getRepository(dataSource, Person);
      const contactPerson = parseContactPerson(request.body);
      await personRepository.save(contactPerson);
      opportunity.contactPersonId = contactPerson.id;

      const { addDistrictToOpportunity } = getDistrictToOpportunityHandler();
      Object.assign(opportunity, await addDistrictToOpportunity(opportunity));

      if (opportunity.agent?.id) {
        const submitter = await getOrCreateSubmitterPerson(
          request.body,
          opportunity.agent.id,
        );
        if (submitter) {
          opportunity.submittedByPersonId = submitter.id;
        }
      }

      const id = await writeOpportunityLegacy(opportunity);

      // Durable backup of the submitter's contact as a piped <|> comment, in
      // addition to the Person-based contact set above. Best-effort: never
      // blocks the submission.
      await writeOpportunityContactComment(
        id,
        opportunity.agent?.id,
        request.body,
      );

      fastify.notify.opsAlert(
        getOpportunityNotificationText(opportunity.title),
      );

      return reply.status(200).send({
        message: `Your opportunity (${id}) has been submitted successfully!`,
        data: { id },
      });
    },
  );
  // TODO: define type
  const _opp45 = {
    id: 8693,
    title: "Ukrainian language translation for Stammtisch, etc.",
    vo_information:
      "Hey, we are a relatively newly opened joint venture in the middle of Sonnenallee with about 250 residents from Ukraine. We would like a Ukrainian-German language mediator for our monthly regulars' table in Neukölln and also for other information events in the house, where low-threshold language teaching is helpful. I am happy to receive your message!",
    accomp_information: null,
    accomp_translation: null,
    accomp_datetime: null,
    berlin_locations: ["Neukölln"],
    schedule_str: "Monday 17-20, Occasional Weekdays",
    datetime_str: null,
    timeslots: [
      {
        day: 1,
        time_slot: "17-20",
      },
    ],
    activities: ["Translation at Accommodation Centers"],
    languages: ["English", "German", "Russian", "Ukrainian"],
    skills: ["Public speaking"],
    status: "Search in process",
    opportunity_type: "volunteering",
    created_at: "2026-02-19T16:01:00.405592Z",
    updated_at: "2026-02-19T16:23:36.065555Z",
    category: "German Language Support",
    category_id: 1,
    last_edited_time_notion: "2026-02-19T15:15:00Z",
  };
  type OpportunityLegacyResponse = typeof _opp45;

  fastify.get<{ Reply: OpportunityLegacyResponse[] }>(
    "/",
    { config: { public: true } as FastifyContextConfig },
    async (_request, reply) => {
      function parseOpportunityLegacyResponse(
        rawList: Opportunity[],
      ): OpportunityLegacyResponse[] {
        const STATUS_MAP = {
          "opp-new": "New",
          "opp-searching": "Search in process",
          "opp-found": "Search completed",
          inactive: "Inactive",
        };

        const TYPE_MAP = {
          regular: "volunteering",
          accompanying: "accompanying",
        };

        const DAY_MAP = {
          MO: 1,
          TU: 2,
          WE: 3,
          TH: 4,
          FR: 5,
          SA: 6,
          SU: 7,
        };

        const TIME_LABEL_MAP = {
          morning: "9-12",
          afternoon: "14-17",
          evening: "17-20",
        };

        function capitalize(str = "") {
          return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
        }

        function parseTimeslots(timeTimeslot = []) {
          const timeslots = [];
          const scheduleLabels = [];

          for (const { timeslot } of timeTimeslot) {
            if (!timeslot) {
              continue;
            }

            const { info, occasional } = timeslot;

            if (occasional) {
              scheduleLabels.push("Occasional Weekdays");
              continue;
            }

            const [dayCode, periodLabel] = (info || "").split("-");
            const day = DAY_MAP[dayCode?.toUpperCase()];
            const time_slot = TIME_LABEL_MAP[periodLabel?.toLowerCase()];

            if (day && time_slot) {
              timeslots.push({ day, time_slot });
              const dayName = Object.keys(DAY_MAP).find(
                (k) => DAY_MAP[k] === day,
              );
              scheduleLabels.push(`${capitalize(dayName)} ${time_slot}`);
            }
          }

          return {
            timeslots,
            schedule_str: [...new Set(scheduleLabels)].join(", ") || null,
          };
        }

        function parseAccompanying(accompanying) {
          if (!accompanying) {
            return {
              accomp_information: null,
              accomp_translation: null,
              accomp_datetime: null,
            };
          }

          const { address, name, phone, email, date, languageToTranslate } =
            accompanying;

          // Build accomp_information from available contact fields
          const infoParts = [
            name && name !== "unknown" ? `Name: ${name}` : null,
            address ? `Address: ${address}` : null,
            phone ? `Phone: ${phone}` : null,
            email ? `Email: ${email}` : null,
          ].filter(Boolean);

          // Treat the epoch sentinel date as "no date set"
          const EPOCH = "1970-01-01T00:00:00.000Z";
          const accomp_datetime = !date || date === EPOCH ? null : date;

          return {
            accomp_information:
              infoParts.length > 0 ? infoParts.join(", ") : null,
            accomp_translation: languageToTranslate ?? null,
            accomp_datetime,
          };
        }

        function mapOpportunityToDelivery(raw) {
          const deal = raw.deal ?? {};

          const activities = (deal.dealActivity ?? [])
            .map((pa) => pa.activity?.title ?? null)
            .filter(Boolean);

          const languages = (deal.dealLanguage ?? [])
            .map((pl) => pl.language?.title ?? null)
            .filter(Boolean);

          const skills = (deal.dealSkill ?? [])
            .map((ps) => ps.skill?.title ?? null)
            .filter(Boolean);

          const berlin_locations = (deal.dealDistrict ?? [])
            .map((ld) => ld.district?.title ?? null)
            .filter(Boolean);

          const { timeslots, schedule_str } = parseTimeslots(deal.dealTimeslot);
          const { accomp_information, accomp_translation, accomp_datetime } =
            parseAccompanying(raw.accompanying);

          return {
            id: raw.id,
            title: raw.title,
            vo_information: raw.info ?? null,
            accomp_information,
            accomp_translation,
            accomp_datetime,
            berlin_locations,
            schedule_str,
            datetime_str: null,
            timeslots,
            activities,
            languages,
            skills,
            status: STATUS_MAP[raw.status] ?? raw.status,
            opportunity_type: TYPE_MAP[raw.type] ?? raw.type,
            created_at: raw.createdAt ?? null,
            updated_at: raw.updatedAt ?? null,
            category: null,
            category_id: deal.categoryId ?? null,
            last_edited_time_notion: null,
          };
        }

        return rawList.map(mapOpportunityToDelivery);
      }

      const opportunityRepository = fastify.db.opportunityRepository;
      const opportunities = await opportunityRepository.find({
        where: {
          status: In([
            OpportunityStatusType.NEW,
            OpportunityStatusType.ACTIVE,
            OpportunityStatusType.SEARCHING,
          ]),
        },
        take: 300,
        relations: [
          "deal.dealLanguage.language",
          "deal.dealActivity.activity",
          "deal.dealSkill.skill",
          "deal.dealTimeslot.timeslot",
          "deal.dealDistrict.district",
          "accompanying",
        ],
      });
      return reply
        .status(200)
        .send(parseOpportunityLegacyResponse(opportunities));
    },
  );
}

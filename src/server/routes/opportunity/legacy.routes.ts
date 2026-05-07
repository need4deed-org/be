import {
  FastifyContextConfig,
  FastifyInstance,
  FastifyPluginOptions,
} from "fastify";
import {
  EntityTableName,
  OpportunityLegacyFormData,
  OpportunityStatusType,
} from "need4deed-sdk";
import { ILike, In } from "typeorm";
import { UnauthorizedError } from "../../../config";
import Comment from "../../../data/entity/comment.entity";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import logger from "../../../logger";
import {
  accompanyingParserOpportunity,
  parseFormData,
  parseOpportunityLegacy,
} from "../../../services";
import { dealParserOpportunity } from "../../../services/dto/parser-deal-opportunity";
import { tryCatchFn } from "../../../services/utils";
import {
  getAgentByPostcode,
  getDistrictToOpportunityHandler,
  getOpportunityOrphanageAgent,
  writeOpportunityLegacy,
} from "../../utils";

export default async function opportunityLegacyRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.post<{ Body: OpportunityLegacyFormData }>(
    "/",
    {
      config: { public: true } as FastifyContextConfig,
      preHandler: async (request) => {
        const relations = ["agentPerson.person", "agentPostcode.postcode"];
        const agentRepository = fastify.db.agentRepository;
        const email = (request.body.rac_email || "").split("@").pop();
        const agents: Agent[] = await agentRepository.find({
          where: {
            agentPerson: { person: { email: ILike(`%@${email}`) } },
          },
          relations,
        });
        if (agents.length === 0) {
          throw new UnauthorizedError(
            "You've got no permission to submit an opportunity.",
          );
        }
        request.agents = agents;
      },
    },
    async (request, reply) => {
      const opportunity = parseFormData(request.body, parseOpportunityLegacy);

      opportunity.deal = await dealParserOpportunity(request.body);
      opportunity.accompanying =
        request.body.opportunity_type === "accompanying"
          ? accompanyingParserOpportunity(request.body)
          : undefined;

      const getAgentByPostcodeTryCatch = tryCatchFn(getAgentByPostcode, (err) =>
        logger.debug(
          `Did not find agent by postcode${request.body.rac_plz}: ${err}`,
        ),
      );
      opportunity.agent =
        getAgentByPostcodeTryCatch(
          request.agents || [],
          request.body.rac_plz,
        ) ?? undefined;

      if (!opportunity.agent) {
        opportunity.agent = await getOpportunityOrphanageAgent();
      }

      const { addDistrictToOpportunity } = getDistrictToOpportunityHandler();
      Object.assign(opportunity, await addDistrictToOpportunity(opportunity));

      const id = await writeOpportunityLegacy(opportunity);

      const commentRepository = fastify.db.commentRepository;
      await commentRepository.save(
        new Comment({
          text: `${request.body.rac_email}<|>${request.body.rac_full_name}<|>${request.body.rac_address}<|>${request.body.rac_plz}<|>${request.body.rac_phone}`,
          entityId: id,
          entityType: EntityTableName.OPPORTUNITY,
          userId: 1,
        }),
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
          const profile = deal.profile ?? {};
          const time = deal.time ?? {};
          const location = deal.location ?? {};

          const activities = (profile.profileActivity ?? [])
            .map((pa) => pa.activity?.title ?? null)
            .filter(Boolean);

          const languages = (profile.profileLanguage ?? [])
            .map((pl) => pl.language?.title ?? null)
            .filter(Boolean);

          const skills = (profile.profileSkill ?? [])
            .map((ps) => ps.skill?.title ?? null)
            .filter(Boolean);

          const berlin_locations = (location.locationDistrict ?? [])
            .map((ld) => ld.district?.title ?? null)
            .filter(Boolean);

          const { timeslots, schedule_str } = parseTimeslots(time.timeTimeslot);
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
            category_id: profile.categoryId ?? null,
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
          "deal.profile.profileLanguage.language",
          "deal.profile.profileActivity.activity",
          "deal.profile.profileSkill.skill",
          "deal.time.timeTimeslot.timeslot",
          "deal.location.locationDistrict.district",
          "accompanying",
        ],
      });
      return reply
        .status(200)
        .send(parseOpportunityLegacyResponse(opportunities));
    },
  );
}

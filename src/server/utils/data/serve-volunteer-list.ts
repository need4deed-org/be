import { FastifyInstance } from "fastify";
import { Brackets } from "typeorm";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";

// Helper function to safely ensure a value is an array, handling null/undefined/single strings
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toArray = (value: any): any[] => {
  if (value === undefined || value === null) {
    return [];
  }
  // Handles single strings from query parser if they should be arrays
  return Array.isArray(value) ? value : [value];
};

export async function getFilteredVolunteers(
  fastify: FastifyInstance,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filterParams: any,
): Promise<[Volunteer[], number]> {
  const mvRepository = fastify.db.volunteerListMvRepository;
  const volunteerRepository = fastify.db.volunteerRepository;

  const limit = filterParams.limit || 12;
  const page = filterParams.page || 1;

  const mvQueryBuilder = mvRepository.createQueryBuilder("v");

  // ----------------------------------------------------------------------
  // 🔑 NEW: 0. SEARCH FILTER (language.title OR activity.title OR district.title ILIKE search)
  // ----------------------------------------------------------------------
  if (filterParams?.search?.length) {
    const searchTerm = `%${filterParams.search}%`;

    // To search across the arrays of titles, we use ARRAY_TO_STRING to combine them
    // into a single string, and then apply the ILIKE operator.
    mvQueryBuilder.andWhere(
      new Brackets((qb) => {
        const searchCondition =
          "ARRAY_TO_STRING(:titleArray, ' ') ILIKE :searchTerm";

        // Search in Language Titles (language.title)
        qb.orWhere(
          searchCondition.replace(":titleArray", "v.language_titles"),
          {
            searchTerm,
          },
        );

        // Search in Activity Titles (activity.title)
        qb.orWhere(
          searchCondition.replace(":titleArray", "v.activity_titles"),
          {
            searchTerm,
          },
        );

        // Search in District Titles (district.title)
        qb.orWhere(
          searchCondition.replace(":titleArray", "v.district_titles"),
          {
            searchTerm,
          },
        );
      }),
    );
  }

  // ----------------------------------------------------------------------
  // 1. LANGUAGE FILTER (german AND languages)
  // ----------------------------------------------------------------------
  if (
    filterParams?.filter?.german === true ||
    filterParams?.filter?.languages?.length
  ) {
    const rawLanguageIds = toArray(filterParams.filter.languages);
    const languageIds = rawLanguageIds.map((id) => parseInt(id, 10));

    if (filterParams.filter.german === true && languageIds.length === 0) {
      mvQueryBuilder.andWhere("v.has_german_language = TRUE");
    } else {
      mvQueryBuilder.andWhere(
        new Brackets((qb) => {
          if (filterParams?.filter?.german === true) {
            qb.andWhere("v.has_german_language = TRUE");
          }
          if (languageIds.length > 0) {
            const query =
              "v.language_ids_array && (ARRAY[:...languageIds]::integer[])";
            qb.andWhere(query, { languageIds });
          }
        }),
      );
    }
  }

  // ----------------------------------------------------------------------
  // 2. DISTRICT FILTER (array overlap)
  // ----------------------------------------------------------------------
  if (filterParams?.filter?.district?.length) {
    const rawDistrictIds = toArray(filterParams.filter.district);
    const districtIds = rawDistrictIds.map((id) => parseInt(id, 10));

    mvQueryBuilder.andWhere(
      "v.district_ids_array && (ARRAY[:...districtIds]::integer[])",
      { districtIds },
    );
  }

  // ----------------------------------------------------------------------
  // 3. ENGAGEMENT FILTER (v.status_engagement)
  // ----------------------------------------------------------------------
  if (filterParams?.filter?.engagement?.length) {
    const engagements = toArray(filterParams.filter.engagement);
    mvQueryBuilder.andWhere("v.status_engagement IN (:...engagements)", {
      // Changed v.status_engagement to v.status based on MV definition
      engagements,
    });
  }

  // ----------------------------------------------------------------------
  // 4. STATUS TYPE FILTER (v.volunteer_type)
  // ----------------------------------------------------------------------
  if (filterParams?.filter?.statusType?.length) {
    const statusTypes = toArray(filterParams.filter.statusType);
    mvQueryBuilder.andWhere("v.status_type IN (:...statusTypes)", {
      statusTypes,
    });
  }

  // ----------------------------------------------------------------------
  // 5. AVAILABILITY FILTER (days, times, occasional)
  // ----------------------------------------------------------------------
  if (filterParams?.filter?.availability) {
    const availability = filterParams.filter.availability;

    // Days filter (e.g., ["MO", "FR"])
    if (availability.days?.length) {
      mvQueryBuilder.andWhere("v.available_days_array && ARRAY[:...days]", {
        days: toArray(availability.days),
      });
    }

    // Times filter (e.g., ["08-11", "17-20"])
    if (availability.times?.length) {
      mvQueryBuilder.andWhere("v.available_times_array && ARRAY[:...times]", {
        times: toArray(availability.times),
      });
    }

    // Occasional filter (e.g., ["weekends"])
    if (availability.occasional?.length) {
      mvQueryBuilder.andWhere(
        "v.available_occasional_array::text[] && ARRAY[:...occasional]",
        {
          occasional: toArray(availability.occasional),
        },
      );
    }
  }

  // ----------------------------------------------------------------------
  // EXECUTION
  // ----------------------------------------------------------------------
  const totalCountQuery = mvQueryBuilder.clone();

  mvQueryBuilder
    .select([
      'v.volunteer_id AS "id"',
      "v.first_name",
      "v.last_name",
      "v.avatar_url",
      "v.status_type",
    ])
    .skip((page - 1) * limit)
    .take(limit)
    .orderBy("v.volunteer_id", "ASC");

  fastify.log.debug("getFilteredVolunteers:go_query");
  const [filteredResults, totalCount] = await Promise.all([
    mvQueryBuilder.getRawMany(),
    totalCountQuery.getCount(),
  ]);

  fastify.log.debug(
    `getFilteredVolunteers:needs_hydration:totalCount: ${filteredResults?.length}/${totalCount}`,
  );
  const volunteerIds = filteredResults?.map(({ id }) => id);

  if (volunteerIds.length === 0) {
    return [[], totalCount];
  }
  fastify.log.debug(
    `getFilteredVolunteers:needs_hydration:volunteerIds: ${volunteerIds}`,
  );

  // ----------------------------------------------------------------------
  // HYDRATION
  // ----------------------------------------------------------------------
  const hydratedVolunteers = await volunteerRepository
    .createQueryBuilder("v")
    .where("v.id IN (:...volunteerIds)", { volunteerIds })
    .leftJoinAndSelect("v.person", "p")
    .leftJoinAndSelect("v.deal", "d")
    .leftJoinAndSelect("d.profile", "d_p")
    .leftJoinAndSelect("d_p.profileLanguage", "d_p_pl")
    .leftJoinAndSelect("d_p_pl.language", "d_p_pl_l")
    .leftJoinAndSelect("d_p.profileActivity", "d_p_pa")
    .leftJoinAndSelect("d_p_pa.activity", "d_p_pa_a")
    .leftJoinAndSelect("d_p.profileSkill", "d_p_ps")
    .leftJoinAndSelect("d_p_ps.skill", "d_p_ps_s")
    .leftJoinAndSelect("d.time", "d_t")
    .leftJoinAndSelect("d_t.timeTimeslot", "d_t_ts")
    .leftJoinAndSelect("d_t_ts.timeslot", "d_t_ts_t")
    .leftJoinAndSelect("d.location", "d_l")
    .leftJoinAndSelect("d_l.locationDistrict", "d_l_ld")
    .leftJoinAndSelect("d_l_ld.district", "d_l_ld_d")
    .getMany();

  // Re-order the hydrated results to match the MV's LIMIT/OFFSET order
  const orderedHydratedVolunteers = volunteerIds
    .map((id) => hydratedVolunteers.find((hv) => hv.id === id))
    .filter((v) => v !== undefined) as Volunteer[];

  fastify.log.debug("getFilteredVolunteers:hydrated!");
  return [orderedHydratedVolunteers, totalCount];
}

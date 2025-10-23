import { FastifyInstance } from "fastify";
import { Brackets } from "typeorm";

import Volunteer from "../../../data/entity/volunteer/volunteer.entity";

export async function getFilteredVolunteers(
  fastify: FastifyInstance,
  filterParams: any,
): Promise<[Volunteer[], number]> {
  const mvRepository = fastify.db.volunteerListMvRepository;
  const volunteerRepository = fastify.db.volunteerRepository;

  const limit = filterParams.limit || 12;
  const page = filterParams.page || 1;

  const mvQueryBuilder = mvRepository.createQueryBuilder("v");

  if (
    filterParams?.filter?.german === true ||
    filterParams?.filter?.languages?.length
  ) {
    const languageIds = filterParams?.filter?.languages
      ? filterParams.filter.languages.map((id) => parseInt(id, 10))
      : [];

    if (filterParams.filter.german === true && languageIds.length === 0) {
      // Handle case where only german=true is present (no further array overlap is needed)
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
  // ... (Add other filters: district, search, engagement, type) ...
  if (filterParams?.filter?.district?.length) {
    const districtIds = filterParams.filter.district.map((id) =>
      parseInt(id, 10),
    );
    // Use the type cast fix for array overlap
    mvQueryBuilder.andWhere(
      "v.district_ids_array && (ARRAY[:...districtIds]::integer[])",
      { districtIds },
    );
  }
  if (filterParams?.filter?.engagement?.length) {
    // Use the `In` operator for cleaner array IN checks
    // mvQueryBuilder.andWhere({ engagement: In(filterParams.filter.engagement) });
    mvQueryBuilder.andWhere("v.engagement IN (:...engagements)", {
      engagements: filterParams.filter.engagement,
    });
  }
  if (filterParams?.filter?.statusType?.length) {
    // Assuming 'statusType' is an array of strings (e.g., ['ACTIVE_ACCOMPANY', 'ACTIVE_SOLO'])
    mvQueryBuilder.andWhere("v.volunteer_type IN (:...statusTypes)", {
      statusTypes: filterParams.filter.statusType,
    });
  }

  const totalCountQuery = mvQueryBuilder.clone(); // Clone for counting

  mvQueryBuilder
    .select(['v.id AS "id"', "v.full_name", "v.avatarUrl", "v.status"])
    .skip((page - 1) * limit)
    .take(limit)
    .orderBy("v.id", "ASC");

  const [filteredResults, totalCount] = await Promise.all([
    mvQueryBuilder.getRawMany(),
    totalCountQuery.getCount(),
  ]);

  const volunteerIds = filteredResults.map(({ id }) => id);

  if (volunteerIds.length === 0) {
    return [[], 0];
  }

  const hydratedVolunteers = await volunteerRepository
    .createQueryBuilder("v")
    // get filtered only
    .where("v.id IN (:...volunteerIds)", { volunteerIds })
    // hydrate
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
    // order
    .orderBy("v.created_at", filterParams?.orderDirection)

    .getMany();

  return [hydratedVolunteers, totalCount];
}

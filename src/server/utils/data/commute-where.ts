import { QueryParamsKeys } from "need4deed-sdk";
import { Raw } from "typeorm";
import { BadRequestError } from "../../../config";
import { dataSource } from "../../../data/data-source";
import Postcode from "../../../data/entity/location/postcode.entity";
import { QuerystringCommuteFiltering } from "../../types";

export interface CommuteFilter {
  postcodeIds: number[];
  maxMinutes: number;
}

export async function resolveCommuteFilter(
  filter?: QuerystringCommuteFiltering,
): Promise<CommuteFilter | null> {
  const value = filter?.[QueryParamsKeys.COMMUTE_POSTCODE];
  const maxMinutes = filter?.[QueryParamsKeys.MAX_COMMUTE_MINUTES];
  if (value === undefined || maxMinutes === undefined) {
    return null;
  }
  const postcodes = await dataSource.getRepository(Postcode).find({
    select: { id: true, latitude: true, longitude: true },
    where: { value },
  });
  if (!postcodes.length) {
    throw new BadRequestError(`Unknown commute postcode "${value}".`);
  }
  if (
    !postcodes.some(
      ({ latitude, longitude }) =>
        Number.isFinite(latitude) && Number.isFinite(longitude),
    )
  ) {
    throw new BadRequestError(
      `Commute postcode "${value}" has no coordinates.`,
    );
  }
  return { postcodeIds: postcodes.map(({ id }) => id), maxMinutes };
}

const commuteParams = ({ postcodeIds, maxMinutes }: CommuteFilter) => ({
  commutePostcodeIds: postcodeIds,
  maxCommuteMinutes: maxMinutes,
});

export function volunteerCommuteIdWhere(commute: CommuteFilter) {
  return Raw(
    (alias) => `${alias} NOT IN (
      SELECT v.id
        FROM volunteer v
        LEFT JOIN person p ON p.id = v.person_id
        LEFT JOIN address a ON a.id = p.address_id
        LEFT JOIN deal d ON d.id = v.deal_id
        JOIN postcode_commute pc
          ON pc.from_postcode_id = COALESCE(a.postcode_id, d.postcode_id)
       WHERE pc.to_postcode_id = ANY(:commutePostcodeIds)
         AND pc.minutes > :maxCommuteMinutes)`,
    commuteParams(commute),
  );
}

export function opportunityCommuteIdWhere(commute: CommuteFilter) {
  return Raw(
    (alias) => `${alias} NOT IN (
      SELECT o.id
        FROM opportunity o
        LEFT JOIN accompanying ac ON ac.id = o.accompanying_id
        LEFT JOIN deal d ON d.id = o.deal_id
        LEFT JOIN agent ag ON ag.id = o.agent_id
        LEFT JOIN address aa ON aa.id = ag.address_id
        JOIN postcode_commute pc
          ON pc.to_postcode_id = COALESCE(ac.postcode_id, d.postcode_id, aa.postcode_id)
       WHERE pc.from_postcode_id = ANY(:commutePostcodeIds)
         AND pc.minutes > :maxCommuteMinutes)`,
    commuteParams(commute),
  );
}

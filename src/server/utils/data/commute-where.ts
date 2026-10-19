import { QueryParamsKeys } from "need4deed-sdk";
import { Raw } from "typeorm";
import { BadRequestError } from "../../../config";
import { dataSource } from "../../../data/data-source";
import Postcode from "../../../data/entity/location/postcode.entity";
import { QuerystringCommuteFiltering } from "../../types";

export interface CommuteFilter {
  postcodeId: number;
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
  const postcode = await dataSource
    .getRepository(Postcode)
    .findOne({ select: { id: true }, where: { value } });
  if (!postcode) {
    throw new BadRequestError(`Unknown commute postcode "${value}".`);
  }
  return { postcodeId: postcode.id, maxMinutes };
}

const commuteParams = ({ postcodeId, maxMinutes }: CommuteFilter) => ({
  commutePostcodeId: postcodeId,
  maxCommuteMinutes: maxMinutes,
});

export function volunteerCommuteIdWhere(commute: CommuteFilter) {
  return Raw(
    (alias) => `${alias} NOT IN (
      SELECT v.id
        FROM volunteer v
        JOIN person p ON p.id = v.person_id
        JOIN address a ON a.id = p.address_id
        JOIN postcode_commute pc ON pc.from_postcode_id = a.postcode_id
       WHERE pc.to_postcode_id = :commutePostcodeId
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
        JOIN postcode_commute pc
          ON pc.to_postcode_id = COALESCE(ac.postcode_id, d.postcode_id)
       WHERE pc.from_postcode_id = :commutePostcodeId
         AND pc.minutes > :maxCommuteMinutes)`,
    commuteParams(commute),
  );
}

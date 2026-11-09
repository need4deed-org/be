import { QueryParamsKeys, UserRole } from "need4deed-sdk";
import { Raw } from "typeorm";
import { BadRequestError, UnauthorizedError } from "../../../config";
import { dataSource } from "../../../data/data-source";
import { QuerystringCommuteFiltering } from "../../types";
import { isStaffRole } from "./is-staff-role";

export const opportunityLocationJoins = `FROM opportunity o
  LEFT JOIN address oa ON oa.id = o.address_id
  LEFT JOIN accompanying ac ON ac.id = o.accompanying_id
  LEFT JOIN deal d ON d.id = o.deal_id
  LEFT JOIN agent ag ON ag.id = o.agent_id
  LEFT JOIN address aa ON aa.id = ag.address_id`;
export const volunteerLocationJoins = `FROM volunteer v
  LEFT JOIN person p ON p.id = v.person_id
  LEFT JOIN address a ON a.id = p.address_id
  LEFT JOIN deal d ON d.id = v.deal_id`;
export const opportunityPostcodeId =
  "COALESCE(CASE WHEN o.type <> 'accompanying' THEN oa.postcode_id END, ac.postcode_id, d.postcode_id, aa.postcode_id)";
export const volunteerPostcodeId = "COALESCE(a.postcode_id, d.postcode_id)";

interface CommuteSourcePostcode {
  postcodeId: number | null;
  postcodeValue: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
}

export interface CommuteFilter {
  postcodeIds: number[];
  maxMinutes: number;
}

export function assertCommuteFilterAccess(
  filter: QuerystringCommuteFiltering | undefined,
  role: UserRole | undefined,
): void {
  const hasCommuteSource =
    filter?.[QueryParamsKeys.COMMUTE_OPPORTUNITY_ID] !== undefined ||
    filter?.[QueryParamsKeys.COMMUTE_VOLUNTEER_ID] !== undefined;
  if (hasCommuteSource && !isStaffRole(role)) {
    throw new UnauthorizedError(
      "Commute filtering is only available to coordinators and admins.",
    );
  }
}

export async function resolveCommuteFilter(
  filter: QuerystringCommuteFiltering | undefined,
  sourceKey:
    | QueryParamsKeys.COMMUTE_OPPORTUNITY_ID
    | QueryParamsKeys.COMMUTE_VOLUNTEER_ID,
): Promise<CommuteFilter | null> {
  const sourceId = filter?.[sourceKey];
  const maxMinutes = filter?.[QueryParamsKeys.MAX_COMMUTE_MINUTES];
  if (sourceId === undefined || maxMinutes === undefined) {
    return null;
  }

  const sourceName =
    sourceKey === QueryParamsKeys.COMMUTE_OPPORTUNITY_ID
      ? "opportunity"
      : "volunteer";
  const sourceQuery =
    sourceKey === QueryParamsKeys.COMMUTE_OPPORTUNITY_ID
      ? `SELECT pc.id AS "postcodeId", pc.value AS "postcodeValue",
           pc.latitude AS latitude, pc.longitude AS longitude
         ${opportunityLocationJoins}
         LEFT JOIN postcode pc ON pc.id = ${opportunityPostcodeId}
         WHERE o.id = $1`
      : `SELECT pc.id AS "postcodeId", pc.value AS "postcodeValue",
           pc.latitude AS latitude, pc.longitude AS longitude
         ${volunteerLocationJoins}
         LEFT JOIN postcode pc ON pc.id = ${volunteerPostcodeId}
         WHERE v.id = $1`;
  const [source] = await dataSource.query<CommuteSourcePostcode[]>(
    sourceQuery,
    [sourceId],
  );
  if (!source) {
    throw new BadRequestError(`Unknown commute ${sourceName} "${sourceId}".`);
  }
  const postcodeId = source.postcodeId;
  if (postcodeId === null) {
    throw new BadRequestError(
      `Commute ${sourceName} "${sourceId}" has no postcode.`,
    );
  }
  const latitude =
    source.latitude === null ? Number.NaN : Number(source.latitude);
  const longitude =
    source.longitude === null ? Number.NaN : Number(source.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new BadRequestError(
      `Commute postcode "${source.postcodeValue ?? postcodeId}" has no coordinates.`,
    );
  }
  return { postcodeIds: [postcodeId], maxMinutes };
}

const commuteParams = ({ postcodeIds, maxMinutes }: CommuteFilter) => ({
  commutePostcodeIds: postcodeIds,
  maxCommuteMinutes: maxMinutes,
});

export function volunteerCommuteIdWhere(commute: CommuteFilter) {
  return Raw(
    (alias) => `${alias} NOT IN (
      SELECT v.id
        ${volunteerLocationJoins}
        JOIN postcode_commute pc
          ON pc.from_postcode_id = ${volunteerPostcodeId}
       WHERE pc.to_postcode_id = ANY(:commutePostcodeIds)
         AND pc.minutes > :maxCommuteMinutes)`,
    commuteParams(commute),
  );
}

export function opportunityCommuteIdWhere(commute: CommuteFilter) {
  return Raw(
    (alias) => `${alias} NOT IN (
      SELECT o.id
        ${opportunityLocationJoins}
        JOIN postcode_commute pc
          ON pc.to_postcode_id = ${opportunityPostcodeId}
       WHERE pc.from_postcode_id = ANY(:commutePostcodeIds)
         AND pc.minutes > :maxCommuteMinutes)`,
    commuteParams(commute),
  );
}

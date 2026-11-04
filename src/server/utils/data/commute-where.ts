import { QueryParamsKeys, UserRole } from "need4deed-sdk";
import { Raw } from "typeorm";
import { BadRequestError, UnauthorizedError } from "../../../config";
import { dataSource } from "../../../data/data-source";
import Postcode from "../../../data/entity/location/postcode.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { QuerystringCommuteFiltering } from "../../types";
import { isStaffRole } from "./is-staff-role";

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
      ? dataSource
          .getRepository(Opportunity)
          .createQueryBuilder("o")
          .select(
            "COALESCE(ac.postcodeId, d.postcodeId, a.postcodeId)",
            "postcodeId",
          )
          .leftJoin("o.accompanying", "ac")
          .leftJoin("o.deal", "d")
          .leftJoin("o.agent", "ag")
          .leftJoin("ag.address", "a")
          .where("o.id = :sourceId", { sourceId })
      : dataSource
          .getRepository(Volunteer)
          .createQueryBuilder("v")
          .select("COALESCE(a.postcodeId, d.postcodeId)", "postcodeId")
          .leftJoin("v.person", "p")
          .leftJoin("p.address", "a")
          .leftJoin("v.deal", "d")
          .where("v.id = :sourceId", { sourceId });
  const source = await sourceQuery.getRawOne<{ postcodeId: number | null }>();
  if (!source) {
    throw new BadRequestError(`Unknown commute ${sourceName} "${sourceId}".`);
  }
  const postcodeId = source.postcodeId;
  if (postcodeId === null) {
    throw new BadRequestError(
      `Commute ${sourceName} "${sourceId}" has no postcode.`,
    );
  }
  const postcode = await dataSource.getRepository(Postcode).findOne({
    select: { id: true, value: true, latitude: true, longitude: true },
    where: { id: postcodeId },
  });
  if (
    !postcode ||
    !Number.isFinite(postcode.latitude) ||
    !Number.isFinite(postcode.longitude)
  ) {
    throw new BadRequestError(
      `Commute postcode "${postcode?.value ?? postcodeId}" has no coordinates.`,
    );
  }
  return { postcodeIds: [postcode.id], maxMinutes };
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

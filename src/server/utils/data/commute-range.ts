import { FastifyRequest } from "fastify";
import {
  AgentEngagementStatusType,
  ApiCommuteRange,
  toCommuteRange,
  UserRole,
} from "need4deed-sdk";
import { In, Not } from "typeorm";
import { dataSource } from "../../../data/data-source";
import { resolveCallerMask } from "../pii/pre-serialization";
import {
  opportunityLocationJoins,
  opportunityPostcodeId,
  volunteerLocationJoins,
  volunteerPostcodeId,
} from "./commute-where";
import { isStaffRole } from "./is-staff-role";

export interface CommutePair {
  volunteerId: number;
  opportunityId: number;
}

export interface OpportunityCommutePair extends CommutePair {
  opportunityAgentId: number | null | undefined;
}

export type CommuteRanges = Map<string, ApiCommuteRange | null>;

export const commutePairKey = ({ volunteerId, opportunityId }: CommutePair) =>
  `${volunteerId}:${opportunityId}`;

export async function loadCommuteRanges(
  pairs: CommutePair[],
): Promise<CommuteRanges> {
  const ranges: CommuteRanges = new Map(
    pairs.map((pair) => [commutePairKey(pair), null]),
  );
  if (!pairs.length) {
    return ranges;
  }
  const rows = await dataSource.query<
    { volunteerId: number; opportunityId: number; minutes: number | null }[]
  >(
    `WITH pair AS (
       SELECT DISTINCT volunteer_id, opportunity_id
         FROM unnest($1::int[], $2::int[]) AS t(volunteer_id, opportunity_id)
     ),
     volunteer_postcode AS (
       SELECT v.id, ${volunteerPostcodeId} AS postcode_id
         ${volunteerLocationJoins}
        WHERE v.id IN (SELECT volunteer_id FROM pair)
     ),
     opportunity_postcode AS (
       SELECT o.id, ${opportunityPostcodeId} AS postcode_id
         ${opportunityLocationJoins}
        WHERE o.id IN (SELECT opportunity_id FROM pair)
     )
     SELECT pair.volunteer_id AS "volunteerId",
            pair.opportunity_id AS "opportunityId",
            CASE WHEN vp.postcode_id = op.postcode_id THEN 0
                 ELSE pc.minutes END AS minutes
       FROM pair
       JOIN volunteer_postcode vp ON vp.id = pair.volunteer_id
       JOIN opportunity_postcode op ON op.id = pair.opportunity_id
       LEFT JOIN postcode_commute pc
         ON pc.from_postcode_id = vp.postcode_id
        AND pc.to_postcode_id = op.postcode_id`,
    [
      pairs.map(({ volunteerId }) => volunteerId),
      pairs.map(({ opportunityId }) => opportunityId),
    ],
  );
  rows.forEach((row) =>
    ranges.set(commutePairKey(row), toCommuteRange(row.minutes)),
  );
  return ranges;
}

type CommuteAccess = (opportunityAgentId: number | null | undefined) => boolean;

async function resolveCommuteAccess(
  request: FastifyRequest,
): Promise<CommuteAccess | null> {
  const role = request.authUser?.role;
  if (isStaffRole(role)) {
    return () => true;
  }
  if (role !== UserRole.AGENT) {
    return null;
  }
  const memberAgentIds = [
    ...((await resolveCallerMask(request))?.agentIds ?? []),
  ];
  const activeAgentIds = new Set(
    memberAgentIds.length
      ? (
          await request.server.db.agentRepository.find({
            select: { id: true },
            where: {
              id: In(memberAgentIds),
              engagementStatus: Not(AgentEngagementStatusType.INACTIVE),
            },
          })
        ).map(({ id }) => id)
      : [],
  );
  return (opportunityAgentId) =>
    !!opportunityAgentId && activeAgentIds.has(opportunityAgentId);
}

export async function loadCommuteRangesForCaller(
  request: FastifyRequest,
  pairs: OpportunityCommutePair[],
): Promise<CommuteRanges | null> {
  const access = await resolveCommuteAccess(request);
  if (!access) {
    return null;
  }
  return loadCommuteRanges(
    pairs.filter(({ opportunityAgentId }) => access(opportunityAgentId)),
  );
}

export function commuteOf(
  ranges: CommuteRanges | null,
  pair: CommutePair,
): ApiCommuteRange | null {
  return ranges?.get(commutePairKey(pair)) ?? null;
}

export function commuteFor(
  ranges: CommuteRanges | null,
  pair: CommutePair,
): { commute?: ApiCommuteRange | null } {
  return ranges ? { commute: commuteOf(ranges, pair) } : {};
}

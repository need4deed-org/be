import { OpportunityType } from "need4deed-sdk";
import {
  Between,
  FindOptionsWhere,
  ILike,
  IsNull,
  LessThanOrEqual,
  MoreThanOrEqual,
  Not,
} from "typeorm";
import { BadRequestError } from "../../../config/error";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import { berlinDayBoundaries } from "../../../services/jobs/german-holidays";
import {
  QuerystringOpportunityFiltering,
  QuerystringOpportunityList,
} from "../../types";
import { normalizeStringArrayInput } from "./for-routes";

export type OpportunityAppointmentFilter = Pick<
  QuerystringOpportunityList,
  | "appointmentDateFrom"
  | "appointmentDateTo"
  | "hasAppointmentDate"
  | "excludeAccompanying"
>;

// appointmentDateFrom/To are Berlin calendar days ("2026-06-30"), not UTC
// ones — this is a Berlin-based product and Opportunity.onetimer.date is
// filtered the same way elsewhere (berlinDayBoundaries, used by
// scanAccompanyNotFound). Parsing with `new Date(value)` would instead
// anchor the range to UTC midnight, shifting it by Berlin's UTC offset.
function parseAppointmentDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new BadRequestError(`Invalid date: "${value}"`);
  }
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function getAppointmentDateWhere(
  appointment?: OpportunityAppointmentFilter,
): FindOptionsWhere<Opportunity> {
  const { appointmentDateFrom, appointmentDateTo, hasAppointmentDate } =
    appointment ?? {};

  if (appointmentDateFrom !== undefined || appointmentDateTo !== undefined) {
    const from =
      appointmentDateFrom !== undefined
        ? berlinDayBoundaries(parseAppointmentDate(appointmentDateFrom))
            .startOfDay
        : undefined;
    const to =
      appointmentDateTo !== undefined
        ? berlinDayBoundaries(parseAppointmentDate(appointmentDateTo)).endOfDay
        : undefined;

    return {
      onetimer: {
        date:
          from && to
            ? Between(from, to)
            : from
              ? MoreThanOrEqual(from)
              : LessThanOrEqual(to!),
      },
    } as FindOptionsWhere<Opportunity>;
  }

  // A range already implies "has an appointment date" — this flag only
  // matters on its own.
  if (hasAppointmentDate) {
    return { onetimerId: Not(IsNull()) } as FindOptionsWhere<Opportunity>;
  }

  return {};
}

function getTypeWhere(
  filter: QuerystringOpportunityFiltering["filter"],
  excludeAccompanying?: boolean,
): FindOptionsWhere<Opportunity> {
  if (filter?.type) {
    const types = Array.isArray(filter.type) ? filter.type : [filter.type];
    // Combine rather than defer: an explicit type list that happens to
    // include "accompanying" still gets it stripped when excludeAccompanying
    // is also set, so the flag's name isn't silently contradicted.
    const filtered = excludeAccompanying
      ? types.filter((type) => type !== OpportunityType.ACCOMPANYING)
      : types;
    return {
      type: normalizeStringArrayInput(filtered),
    } as FindOptionsWhere<Opportunity>;
  }

  return excludeAccompanying
    ? ({
        type: Not(OpportunityType.ACCOMPANYING),
      } as FindOptionsWhere<Opportunity>)
    : {};
}

// SECURITY (#666): filters run on unmasked DB columns, so a non-privileged
// caller can infer PII masked in the response by probing which rows match.
export function getOpportunityWhere(
  filter: QuerystringOpportunityFiltering["filter"],
  appointment?: OpportunityAppointmentFilter,
): FindOptionsWhere<Opportunity> {
  return {
    ...getTypeWhere(filter, appointment?.excludeAccompanying),
    ...getAppointmentDateWhere(appointment),
    ...(filter?.status
      ? {
          status: normalizeStringArrayInput(filter.status),
        }
      : {}),
    ...(filter?.search
      ? {
          title: ILike(`%${filter.search}%`),
        }
      : {}),
    // language, district, activity and skill all constrain the same `deal` relation, so they must share a
    // single `deal` key.
    // if we use two spreads with the same key, the second replaces the first, and the earlier
    // constraint is silently dropped.
    ...(filter?.language ||
    filter?.district ||
    filter?.activity ||
    filter?.skill
      ? {
          deal: {
            ...(filter?.language && {
              dealLanguage: {
                language: { id: normalizeStringArrayInput(filter.language) },
              },
            }),
            ...(filter?.district && {
              dealDistrict: {
                district: { id: normalizeStringArrayInput(filter.district) },
              },
            }),
            ...(filter?.activity && {
              dealActivity: {
                activity: { id: normalizeStringArrayInput(filter.activity) },
              },
            }),
            ...(filter?.skill && {
              dealSkill: {
                skill: { id: normalizeStringArrayInput(filter.skill) },
              },
            }),
          },
        }
      : {}),
  } as FindOptionsWhere<Opportunity>;
}

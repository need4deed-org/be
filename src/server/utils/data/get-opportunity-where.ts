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
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import { berlinDayBoundaries } from "../../../services/jobs/german-holidays";
import {
  QuerystringOpportunityFiltering,
  QuerystringOpportunityList,
} from "../../types";
import { normalizeStringArrayInput } from "./for-routes";
import { parseDateOnly } from "./parse-date-only";
import { escapeLikePattern } from "./person-name-ilike";

export type OpportunityAppointmentFilter = Pick<
  QuerystringOpportunityList,
  | "appointmentDateFrom"
  | "appointmentDateTo"
  | "hasAppointmentDate"
  | "excludeAccompanying"
>;

function hasFilterValue(value: string | string[] | undefined): boolean {
  return Array.isArray(value) ? value.length > 0 : Boolean(value);
}

function getAppointmentDateWhere(
  appointment?: OpportunityAppointmentFilter,
): FindOptionsWhere<Opportunity> {
  const { appointmentDateFrom, appointmentDateTo, hasAppointmentDate } =
    appointment ?? {};

  if (appointmentDateFrom !== undefined || appointmentDateTo !== undefined) {
    const from =
      appointmentDateFrom !== undefined
        ? berlinDayBoundaries(parseDateOnly(appointmentDateFrom)).startOfDay
        : undefined;
    const to =
      appointmentDateTo !== undefined
        ? berlinDayBoundaries(parseDateOnly(appointmentDateTo)).endOfDay
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

  if (hasAppointmentDate) {
    return { onetimerId: Not(IsNull()) } as FindOptionsWhere<Opportunity>;
  }

  return {};
}

function getTypeWhere(
  filter: QuerystringOpportunityFiltering["filter"],
  excludeAccompanying?: boolean,
): FindOptionsWhere<Opportunity> {
  if (hasFilterValue(filter?.type)) {
    const types = Array.isArray(filter.type) ? filter.type : [filter.type];
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

function getDealWhere(
  filter: QuerystringOpportunityFiltering["filter"],
): Record<string, unknown> {
  const dealFilter: Record<string, unknown> = {};
  if (hasFilterValue(filter?.language)) {
    dealFilter.dealLanguage = {
      language: { id: normalizeStringArrayInput(filter.language) },
    };
  }
  if (hasFilterValue(filter?.activity)) {
    dealFilter.dealActivity = {
      activity: { id: normalizeStringArrayInput(filter.activity) },
    };
  }
  if (hasFilterValue(filter?.skill)) {
    dealFilter.dealSkill = {
      skill: { id: normalizeStringArrayInput(filter.skill) },
    };
  }
  return dealFilter;
}

export function getOpportunityWhere(
  filter: QuerystringOpportunityFiltering["filter"],
  appointment?: OpportunityAppointmentFilter,
): FindOptionsWhere<Opportunity> | FindOptionsWhere<Opportunity>[] {
  const dealFilter = getDealWhere(filter);

  const base = {
    ...getTypeWhere(filter, appointment?.excludeAccompanying),
    ...getAppointmentDateWhere(appointment),
    ...(hasFilterValue(filter?.status)
      ? {
          status: normalizeStringArrayInput(filter.status),
        }
      : {}),
    ...(filter?.search
      ? {
          title: ILike(`%${escapeLikePattern(filter.search)}%`),
        }
      : {}),
    ...(Object.keys(dealFilter).length ? { deal: dealFilter } : {}),
  } as FindOptionsWhere<Opportunity>;

  if (hasFilterValue(filter?.district)) {
    const districtIds = normalizeStringArrayInput(filter!.district!);
    return [
      { ...base, districtId: districtIds },
      {
        ...base,
        deal: {
          ...((base.deal as Record<string, unknown>) ?? {}),
          dealDistrict: { district: { id: districtIds } },
        },
      },
    ] as FindOptionsWhere<Opportunity>[];
  }

  return base;
}

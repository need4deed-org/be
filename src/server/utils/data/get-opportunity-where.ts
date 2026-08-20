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
import { QuerystringOpportunityFiltering } from "../../types";
import { normalizeStringArrayInput } from "./for-routes";

export interface OpportunityAppointmentFilter {
  appointmentDateFrom?: string;
  appointmentDateTo?: string;
  hasAppointmentDate?: boolean;
  excludeAccompanying?: boolean;
}

function parseAppointmentDate(value: string): Date {
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new BadRequestError(`Invalid date: "${value}"`);
  }
  return date;
}

// A `...To` bound is a calendar day, e.g. "2026-06-30" — inclusive of every
// appointment that day, not just the one at its midnight instant.
function endOfDay(date: Date): Date {
  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

function getAppointmentDateWhere(
  appointment?: OpportunityAppointmentFilter,
): FindOptionsWhere<Opportunity> {
  const { appointmentDateFrom, appointmentDateTo, hasAppointmentDate } =
    appointment ?? {};

  if (appointmentDateFrom || appointmentDateTo) {
    const from = appointmentDateFrom
      ? parseAppointmentDate(appointmentDateFrom)
      : undefined;
    const to = appointmentDateTo
      ? endOfDay(parseAppointmentDate(appointmentDateTo))
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

// SECURITY (#666): filters run on unmasked DB columns, so a non-privileged
// caller can infer PII masked in the response by probing which rows match.
export function getOpportunityWhere(
  filter: QuerystringOpportunityFiltering["filter"],
  appointment?: OpportunityAppointmentFilter,
): FindOptionsWhere<Opportunity> {
  return {
    ...(filter?.type
      ? {
          type: normalizeStringArrayInput(filter.type),
        }
      : appointment?.excludeAccompanying
        ? { type: Not(OpportunityType.ACCOMPANYING) }
        : {}),
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
    ...(filter?.language
      ? {
          deal: {
            dealLanguage: {
              language: {
                id: normalizeStringArrayInput(filter.language),
              },
            },
          },
        }
      : {}),
    ...(filter?.district
      ? {
          deal: {
            dealDistrict: {
              district: {
                id: normalizeStringArrayInput(filter.district),
              },
            },
          },
        }
      : {}),
    ...(filter?.activity
      ? {
          deal: {
            dealActivity: {
              activity: {
                id: normalizeStringArrayInput(filter.activity),
              },
            },
          },
        }
      : {}),
  } as FindOptionsWhere<Opportunity>;
}

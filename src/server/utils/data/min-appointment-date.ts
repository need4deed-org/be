import {
  berlinToday,
  MIN_APPOINTMENT_WORKING_DAYS,
  minAppointmentDay,
  UserRole,
} from "need4deed-sdk";
import { BadRequestError } from "../../../config";
import { formatOnetimerDate } from "../../../services/dto/utils";
import { berlinDayBoundaries } from "../../../services/jobs/berlin-dates";
import { isStaffRole } from "./is-staff-role";

export function minAppointmentDate(today: Date = berlinToday()): Date {
  return berlinDayBoundaries(minAppointmentDay(today)).startOfDay;
}

export function assertAppointmentNotTooSoon(
  appointment: Date,
  role: UserRole | undefined,
  current?: Date | null,
  today: Date = berlinToday(),
): void {
  if (isNaN(appointment.getTime())) {
    throw new BadRequestError("The appointment date is invalid.");
  }
  if (isStaffRole(role)) {
    return;
  }
  if (
    current &&
    formatOnetimerDate(current) === formatOnetimerDate(appointment)
  ) {
    return;
  }
  const earliest = minAppointmentDate(today);
  if (appointment < earliest) {
    throw new BadRequestError(
      `The appointment must be at least ${MIN_APPOINTMENT_WORKING_DAYS} working days from today, on ${formatOnetimerDate(earliest)} or later.`,
    );
  }
}

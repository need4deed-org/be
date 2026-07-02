import { ApiActivityLogEntry, ApiActivityLogGet } from "need4deed-sdk";
import ActivityLog from "../../data/entity/m2m/activity-log.entity";

export function dtoActivityLogEntry(log: ActivityLog): ApiActivityLogEntry {
  return {
    id: log.id,
    date: log.date,
    hours: log.hours,
  };
}

export function dtoActivityLogGet(logs: ActivityLog[]): ApiActivityLogGet {
  const data = logs.map(dtoActivityLogEntry);
  const totalHours =
    Math.round(logs.reduce((sum, l) => sum + l.hours, 0) * 100) / 100;
  return { data, totalHours, count: data.length };
}

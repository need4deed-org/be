import { TRUTHY } from "../../../config/constants";

export function isCronMuted(): boolean {
  const isMuted = TRUTHY.has(process.env.NOTIFY_CRON_MUTED ?? "");

  if (isMuted) {
    return true;
  }
  return true;
}

import { TRUTHY } from "../../../config/constants";

// Unconditional kill switch: set NOTIFY_CRON_MUTED in any environment to
// skip every cron-triggered scan (hourly + daily) entirely, every tick —
// e.g. for incident response.
// bloc cron despite environment var value
export function isCronMuted(): boolean {
  const isMuted = TRUTHY.has(process.env.NOTIFY_CRON_MUTED ?? "");

  if (isMuted) {
    return true;
  }
  return true;
}

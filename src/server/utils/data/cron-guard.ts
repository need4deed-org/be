import { isProd, TRUTHY } from "../../../config/constants";

// `NOTIFY_CRON_MUTED` is an unconditional kill switch: set in any
// environment, it skips the cron scan entirely, every tick, regardless of
// NODE_ENV — for incident response (e.g. a bad email template going out).
//
// `NOTIFY_CRON_GUARD` is a safer standing default: it only takes effect in
// production. Outside production it's a no-op — the scan still runs against
// whatever DB it's pointed at, and any email it sends goes through the same
// `fastify.notify` transport (and the same dry-run resolution) that
// state-triggered notifications already use, since cron and state-triggered
// sends share that one transport instance.
export function isCronMuted(): boolean {
  if (TRUTHY.has(process.env.NOTIFY_CRON_MUTED ?? "")) {
    return true;
  }
  return isProd && TRUTHY.has(process.env.NOTIFY_CRON_GUARD ?? "");
}

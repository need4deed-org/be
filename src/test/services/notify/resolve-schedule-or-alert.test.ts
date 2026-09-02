import { describe, expect, it, vi } from "vitest";
import { errorEmailRecipient } from "../../../config/constants";
import DealTimeslot from "../../../data/entity/m2m/deal-timeslot";
import { resolveScheduleOrAlert } from "../../../services/notify/resolve-schedule-or-alert";
import type { EmailTransport } from "../../../services/notify/types";

describe("resolveScheduleOrAlert", () => {
  it("returns the formatter's result without alerting on success", async () => {
    const email: EmailTransport = { send: vi.fn() };
    const formatter = vi.fn(() => "Montag, 08–11 Uhr");

    const result = await resolveScheduleOrAlert(
      email,
      [] as DealTimeslot[],
      formatter,
      "fallback",
      "test context",
    );

    expect(result).toBe("Montag, 08–11 Uhr");
    expect(email.send).not.toHaveBeenCalled();
  });

  it("falls back and alerts errorEmailRecipient when the formatter throws", async () => {
    const email: EmailTransport = { send: vi.fn() };
    const formatter = vi.fn(() => {
      throw new Error("Timeslot is lacking required fields");
    });

    const result = await resolveScheduleOrAlert(
      email,
      [] as DealTimeslot[],
      formatter,
      "wird noch abgestimmt",
      "sendEmailIntroduction, ov 42",
    );

    expect(result).toBe("wird noch abgestimmt");
    expect(email.send).toHaveBeenCalledTimes(1);
    const alert = vi.mocked(email.send).mock.calls[0][0];
    expect(alert.to).toBe(errorEmailRecipient);
    expect(alert.subject).toContain("sendEmailIntroduction, ov 42");
    expect(alert.text).toContain("Timeslot is lacking required fields");
    expect(alert.text).toContain("wird noch abgestimmt");
  });
});

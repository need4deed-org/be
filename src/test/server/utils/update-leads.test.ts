import { beforeEach, describe, expect, it, vi } from "vitest";
import LeadFrom from "../../../data/entity/lead.entity";
import StatisticsEvent from "../../../data/entity/statistics-event.entity";
import { updateLeads } from "../../../server/utils/data/update-leads";

const leadFromSave = vi.fn();
const eventSave = vi.fn();

vi.mock("../../../data/data-source", () => ({
  dataSource: {
    getRepository: (entity: unknown) =>
      entity === StatisticsEvent ? { save: eventSave } : { save: leadFromSave },
  },
}));

describe("updateLeads", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("increments each lead.count and calls repository.save with the same array", async () => {
    const leads: LeadFrom[] = [
      { id: 1, count: 0, title: "a" },
      { id: 2, count: 5, title: "b" },
    ];

    leadFromSave.mockResolvedValueOnce(leads);

    await updateLeads(leads);

    expect(leadFromSave).toHaveBeenCalledWith(leads);
    expect(leads[0].count).toBe(1);
    expect(leads[1].count).toBe(6);
  });

  it("records one lead-from statistics event per answer", async () => {
    const leads: LeadFrom[] = [
      { id: 1, count: 0, title: "a" },
      { id: 2, count: 0, title: "b" },
    ];

    await updateLeads(leads);

    const events = eventSave.mock.calls[0][0] as StatisticsEvent[];
    expect(events.map((e) => [e.metric, e.valueKey])).toEqual([
      ["lead-from", "1"],
      ["lead-from", "2"],
    ]);
    expect(events[0].occurredAt).toBeInstanceOf(Date);
  });

  it("doesn't fail when the statistics event can't be saved", async () => {
    eventSave.mockRejectedValueOnce(new Error("no table"));

    await expect(
      updateLeads([{ id: 1, count: 0, title: "a" }]),
    ).resolves.toBeUndefined();
  });

  it("records nothing when no answer was ticked", async () => {
    await updateLeads([]);
    expect(eventSave).not.toHaveBeenCalled();
  });

  it("propagates repository errors", async () => {
    const leads: LeadFrom[] = [{ id: 3, count: 2, title: "c" }];
    leadFromSave.mockRejectedValueOnce(new Error("save failed"));

    await expect(updateLeads(leads)).rejects.toThrow("save failed");
    expect(leads[0].count).toBe(3); // mutation happens before save
  });
});

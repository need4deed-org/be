import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateLeads } from "../../../server/utils/updateLeads";
import LeadFrom from "../../../data/entity/lead.entity";

const leadFromSave = vi.fn();

vi.mock("../../../data/data-source", () => ({
  dataSource: {
    getRepository: () => ({ save: leadFromSave }),
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

  it("propagates repository errors", async () => {
    const leads: LeadFrom[] = [{ id: 3, count: 2, title: "c" }];
    leadFromSave.mockRejectedValueOnce(new Error("save failed"));

    await expect(updateLeads(leads)).rejects.toThrow("save failed");
    expect(leads[0].count).toBe(3); // mutation happens before save
  });
});
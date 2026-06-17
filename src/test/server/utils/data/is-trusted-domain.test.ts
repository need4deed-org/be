import { beforeEach, describe, expect, it, vi } from "vitest";
import { isEmailDomainTrusted } from "../../../../server/utils/data/is-trusted-domain";

const countBy = vi.fn();
vi.mock("../../../../data/data-source", () => ({
  dataSource: { getRepository: () => ({ countBy }) },
}));

beforeEach(() => {
  vi.resetAllMocks();
});

describe("isEmailDomainTrusted", () => {
  it("is true when the email's domain is on the allowlist", async () => {
    countBy.mockResolvedValueOnce(1);
    expect(await isEmailDomainTrusted("rep@need4deed.org")).toBe(true);
    expect(countBy).toHaveBeenCalledWith({ domain: "need4deed.org" });
  });

  it("is false when the domain is not on the allowlist", async () => {
    countBy.mockResolvedValueOnce(0);
    expect(await isEmailDomainTrusted("rep@unknown.example")).toBe(false);
  });

  it("lowercases the domain before looking it up", async () => {
    countBy.mockResolvedValueOnce(1);
    await isEmailDomainTrusted("Rep@Need4Deed.ORG");
    expect(countBy).toHaveBeenCalledWith({ domain: "need4deed.org" });
  });

  it("is false (no DB call) for an email with no domain part", async () => {
    expect(await isEmailDomainTrusted("rep@")).toBe(false);
    expect(await isEmailDomainTrusted("")).toBe(false);
    expect(countBy).not.toHaveBeenCalled();
  });
});

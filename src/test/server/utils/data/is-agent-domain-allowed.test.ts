import { beforeEach, describe, expect, it, vi } from "vitest";
import { isAgentDomainAllowed } from "../../../../server/utils/data/is-agent-domain-allowed";

const isEmailDomainTrustedMock = vi.fn();
vi.mock("../../../../server/utils/data/is-trusted-domain", () => ({
  isEmailDomainTrusted: (...args: unknown[]) =>
    isEmailDomainTrustedMock(...args),
}));

beforeEach(() => {
  vi.resetAllMocks();
});

describe("isAgentDomainAllowed", () => {
  it("is true when hasExistingMemberOnDomain matches, without checking the trusted allowlist", async () => {
    const hasExistingMemberOnDomain = vi.fn().mockResolvedValue(true);

    const allowed = await isAgentDomainAllowed(
      "rep@center.de",
      hasExistingMemberOnDomain,
    );

    expect(allowed).toBe(true);
    expect(hasExistingMemberOnDomain).toHaveBeenCalledWith("center.de");
    expect(isEmailDomainTrustedMock).not.toHaveBeenCalled();
  });

  it("falls back to the trusted allowlist when there's no existing-member match", async () => {
    const hasExistingMemberOnDomain = vi.fn().mockResolvedValue(false);
    isEmailDomainTrustedMock.mockResolvedValueOnce(true);

    const allowed = await isAgentDomainAllowed(
      "rep@brandnew.de",
      hasExistingMemberOnDomain,
    );

    expect(allowed).toBe(true);
  });

  it("is false when neither the existing-member check nor the trusted allowlist pass", async () => {
    const hasExistingMemberOnDomain = vi.fn().mockResolvedValue(false);
    isEmailDomainTrustedMock.mockResolvedValueOnce(false);

    const allowed = await isAgentDomainAllowed(
      "rep@stranger.de",
      hasExistingMemberOnDomain,
    );

    expect(allowed).toBe(false);
  });

  it("be#1001: skips hasExistingMemberOnDomain entirely for a free-email domain", async () => {
    const hasExistingMemberOnDomain = vi.fn().mockResolvedValue(true);
    isEmailDomainTrustedMock.mockResolvedValueOnce(false);

    const allowed = await isAgentDomainAllowed(
      "rep@gmail.com",
      hasExistingMemberOnDomain,
    );

    expect(allowed).toBe(false);
    expect(hasExistingMemberOnDomain).not.toHaveBeenCalled();
  });

  it("be#1001: still allows a free-email domain once it's explicitly trusted", async () => {
    const hasExistingMemberOnDomain = vi.fn().mockResolvedValue(true);
    isEmailDomainTrustedMock.mockResolvedValueOnce(true);

    const allowed = await isAgentDomainAllowed(
      "rep@gmail.com",
      hasExistingMemberOnDomain,
    );

    expect(allowed).toBe(true);
    expect(hasExistingMemberOnDomain).not.toHaveBeenCalled();
  });

  it("is false (no calls at all) for an email with no domain part", async () => {
    const hasExistingMemberOnDomain = vi.fn();

    expect(await isAgentDomainAllowed("", hasExistingMemberOnDomain)).toBe(
      false,
    );

    expect(hasExistingMemberOnDomain).not.toHaveBeenCalled();
    expect(isEmailDomainTrustedMock).not.toHaveBeenCalled();
  });
});

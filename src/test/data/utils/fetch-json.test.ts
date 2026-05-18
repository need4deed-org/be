import * as fs from "fs/promises";
import { describe, expect, it, vi } from "vitest";
import { fetchJsonFromUrl } from "../../../data/utils";

vi.mock("fs/promises", () => ({
  readFile: vi.fn(),
}));

describe("fetchJsonFromUrl", () => {
  it("reads and parses JSON from a file path", async () => {
    vi.mocked(fs.readFile).mockResolvedValueOnce('{"key":"value"}');
    const result = await fetchJsonFromUrl("./data/seed.json");
    expect(result).toEqual({ key: "value" });
    expect(fs.readFile).toHaveBeenCalledWith("./data/seed.json", "utf-8");
  });

  it("fetches JSON from a URL", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      json: () => Promise.resolve({ remote: true }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await fetchJsonFromUrl("https://example.com/data.json");
    expect(result).toEqual({ remote: true });
    expect(mockFetch).toHaveBeenCalledWith("https://example.com/data.json");

    vi.unstubAllGlobals();
  });

  it("treats absolute paths as file system paths", async () => {
    vi.mocked(fs.readFile).mockResolvedValueOnce('{"absolute":true}');
    const result = await fetchJsonFromUrl("/etc/config.json");
    expect(result).toEqual({ absolute: true });
  });
});

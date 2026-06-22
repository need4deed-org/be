import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join, relative } from "path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { fetchJsonFromUrl } from "../../../data/utils";

// `fs/promises` is an externalized node builtin and is not intercepted by
// `vi.mock` under the swc transform used here, so the file-path branches are
// tested against a real temp file rather than a mocked readFile.

describe("fetchJsonFromUrl", () => {
  let dir: string;
  let filePath: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), "fetch-json-"));
    filePath = join(dir, "data.json");
    await writeFile(filePath, '{"key":"value"}', "utf-8");
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("reads and parses JSON from a dot-relative file path", async () => {
    const relPath = `./${relative(process.cwd(), filePath)}`;
    const result = await fetchJsonFromUrl(relPath);
    expect(result).toEqual({ key: "value" });
  });

  it("treats absolute paths as file system paths", async () => {
    const result = await fetchJsonFromUrl(filePath);
    expect(result).toEqual({ key: "value" });
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
});

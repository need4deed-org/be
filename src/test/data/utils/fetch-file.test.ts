import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { fetchFileFromUrl } from "../../../data/utils";

describe("fetchFileFromUrl", () => {
  let dir: string;
  let filePath: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), "fetch-file-"));
    filePath = join(dir, "form.pdf");
    await writeFile(filePath, "%PDF-1.4");
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads a file system path", async () => {
    const result = await fetchFileFromUrl(filePath, 1000);
    expect(result.toString()).toBe("%PDF-1.4");
  });

  it("downloads a URL", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(Buffer.from("%PDF-1.4"))),
    );

    const result = await fetchFileFromUrl(
      "https://cdn.example.com/f.pdf",
      1000,
    );

    expect(result.toString()).toBe("%PDF-1.4");
  });

  it("throws on a non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("nope", { status: 404 })),
    );

    await expect(
      fetchFileFromUrl("https://cdn.example.com/f.pdf", 1000),
    ).rejects.toThrow("(404)");
  });
});

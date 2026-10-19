import { readFile } from "fs/promises";
import { isProbablyFileSystemPath } from "../../services/utils";

export async function fetchFileFromUrl(
  url: string,
  timeoutMs?: number,
): Promise<Buffer> {
  if (isProbablyFileSystemPath(url)) {
    return readFile(url);
  }
  const response = await fetch(
    url,
    timeoutMs !== undefined
      ? { signal: AbortSignal.timeout(timeoutMs) }
      : undefined,
  );
  if (!response.ok) {
    throw new Error(`fetch ${url} failed (${response.status})`);
  }
  return Buffer.from(await response.arrayBuffer());
}

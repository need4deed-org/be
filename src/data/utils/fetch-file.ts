export async function fetchFileFromUrl(
  url: string,
  timeoutMs: number,
): Promise<Buffer> {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) {
    throw new Error(`fetch ${url} failed (${response.status})`);
  }
  return Buffer.from(await response.arrayBuffer());
}

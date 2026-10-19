import { fetchFileFromUrl } from "./fetch-file";

export async function fetchJsonFromUrl(url: string): Promise<unknown> {
  return JSON.parse((await fetchFileFromUrl(url)).toString("utf-8"));
}

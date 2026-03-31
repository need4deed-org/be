import { readFile } from "fs/promises";
import { isProbablyFileSystemPath } from "../../services/utils";

export async function fetchJsonFromUrl(url: string): Promise<unknown> {
  if (isProbablyFileSystemPath(url)) {
    const text = await readFile(url, "utf-8");
    return JSON.parse(text);
  }
  return fetch(url).then((response) => response.json());
}

export async function fetchJsonFromUrl(url: string): Promise<unknown> {
  return fetch(url).then((response) => response.json());
}

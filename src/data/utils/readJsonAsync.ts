import * as fs from "fs/promises";

/**
 * Reads a JSON file asynchronously from the specified path and parses its content into a JavaScript object.
 *
 * This function uses Node.js's `fs.promises.readFile` for non-blocking file I/O
 * and `JSON.parse` to convert the file content string into a JavaScript object.
 * It includes robust error handling for common file-reading and JSON-parsing issues.
 *
 * @param {string} filePath - The absolute or relative path to the JSON file.
 * @returns {Promise<any>} A Promise that resolves with the parsed JSON data.
 *
 * @throws {Error} If the file cannot be read, the file does not exist (`ENOENT`),
 * or the file content is not valid JSON (`SyntaxError`). The original error is re-thrown.
 */
export async function readJsonAsync(filePath: string) {
  try {
    const fileContent = await fs.readFile(filePath, "utf8");
    const jsonData = JSON.parse(fileContent);

    return jsonData;
  } catch (error) {
    if (error.code === "ENOENT") {
      console.error(`Error: File not found at ${filePath}`);
    } else if (error instanceof SyntaxError) {
      console.error("Error parsing JSON:", error.message);
    } else {
      console.error("An unexpected error occurred:", error);
      throw new Error(
        `Failed to read JSON file ${filePath}: ${error.message || error}`,
      );
    }
  }
}

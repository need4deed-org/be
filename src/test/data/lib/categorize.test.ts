import { describe, expect, it } from "vitest";
import { categorize } from "../../../data/lib"; // Adjust path as needed

describe("categorize()", () => {
  it("should return null for an empty array", () => {
    expect(categorize([])).toBeNull();
  });

  it("should return the item if all items are the same", () => {
    const input = ["apple", "apple", "apple"];
    expect(categorize(input)).toBe("apple");
  });

  it("should return the most frequent item", () => {
    const input = ["apple", "banana", "orange", "apple", "banana", "apple"];
    expect(categorize(input)).toBe("apple");
  });

  it("should return the first item in the list if there're all different items", () => {
    const input = ["banana", "apple", "peach", "orange"];
    expect(categorize(input)).toBe("banana");
  });

  it("should return the first item in the list if there is no single most frequent item (tie)", () => {
    // In a tie (2 apples, 2 bananas), it should return the one that appeared first
    const input = ["banana", "apple", "apple", "banana"];
    expect(categorize(input)).toBe("banana");
  });

  it("should work with different data types (numbers)", () => {
    const input = [10, 20, 20, 30, 10, 20];
    expect(categorize(input)).toBe(20);
  });

  it("should handle a list with only one item", () => {
    expect(categorize(["lonely"])).toBe("lonely");
  });
});

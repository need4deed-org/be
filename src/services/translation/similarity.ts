// Similarity of two texts in [0, 1]: 1 - levenshtein / max(length), on
// characters. Used by the same-language guard (validate.ts): a "translation"
// that stays this close to its input was most likely already in the target
// language and got reworded instead of translated (be#1065). Quadratic in
// time but O(min(length)) in memory; fields are at most a few thousand
// characters.
export function similarity(a: string, b: string): number {
  if (a === b) {
    return 1;
  }
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  if (shorter.length === 0) {
    return 0;
  }

  let previous = Array.from({ length: shorter.length + 1 }, (_, i) => i);
  let current = new Array<number>(shorter.length + 1);
  for (let i = 1; i <= longer.length; i++) {
    current[0] = i;
    for (let j = 1; j <= shorter.length; j++) {
      const substitution =
        previous[j - 1] + (longer[i - 1] === shorter[j - 1] ? 0 : 1);
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, substitution);
    }
    [previous, current] = [current, previous];
  }

  return 1 - previous[shorter.length] / longer.length;
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

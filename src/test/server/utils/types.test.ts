import { describe, expect, it } from "vitest";
import type {
  DeeplyNestedObject,
  EnumValuesMap,
  ExtendWithEnumValues,
} from "../../../server/utils";

describe("server/utils/types", () => {
  it("EnumValuesMap: maps enum values to V and enforces keys/types at compile time", () => {
    type E = { A: "a"; B: "b" };
    type M = EnumValuesMap<E, number>;

    const ok: M = { a: 1, b: 2 };
    expect(ok.a).toBe(1);

    // @ts-expect-error - missing key 'b'
    const _missingKey: M = { a: 1 };

    // @ts-expect-error - extra key 'c' not allowed
    const _extraKey: M = { a: 1, b: 2, c: 3 };

    // @ts-expect-error - wrong value type for 'a'
    const _wrongValue: M = { a: "no", b: 2 };
  });

  it("ExtendWithEnumValues: merges base and enum-derived keys", () => {
    type Base = { id: number; name?: string };
    type E = { X: "x"; Y: "y" };
    type R = ExtendWithEnumValues<Base, E, boolean>;

    const ok: R = { id: 10, x: true, y: false, name: "item" };
    expect(ok.id).toBe(10);

    // @ts-expect-error - missing enum key 'y'
    const _missingEnum: R = { id: 1, x: true };

    // @ts-expect-error - wrong type for enum key 'x'
    const _wrongEnumType: R = { id: 1, x: 1, y: false };
  });

  it("DeeplyNestedObject: accepts primitives, nested plain objects and arrays; rejects disallowed types", () => {
    const good: DeeplyNestedObject = {
      str: "s",
      num: 3,
      bool: false,
      nul: null,
      undef: undefined,
      obj: { inner: { leaf: "v" } },
      arr: [{ a: 1 }, {}],
    };
    expect(good.str).toBe("s");
    expect((good.obj as any).inner.leaf).toBe("v");

    // @ts-expect-error - functions are not allowed
    const _badFn: DeeplyNestedObject = { f: () => {} };

    // @ts-expect-error - Date (class instance) is not permitted by the type
    const _badDate: DeeplyNestedObject = { d: new Date() };
  });
});

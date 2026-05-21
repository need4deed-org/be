export type EnumValuesMap<E extends Record<string, string>, V = string> = {
  [K in E[keyof E]]: V;
};

export type ExtendWithEnumValues<
  Base extends object,
  E extends Record<string, string>,
  V = string,
> = Base & { [K in E[keyof E]]: V };

type Primitive = string | number | boolean | null | undefined;

// The core recursive type alias
export type DeeplyNestedObject = {
  [key: string]: Primitive | DeeplyNestedObject | DeeplyNestedObject[];
};

export type Voidable<T> = T | null | undefined;

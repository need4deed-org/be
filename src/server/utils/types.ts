export type EnumValuesMap<E extends Record<string, string>, V = string> = {
  [K in E[keyof E]]: V;
};

export type ExtendWithEnumValues<
  Base extends object,
  E extends Record<string, string>,
  V = string,
> = Base & { [K in E[keyof E]]: V };

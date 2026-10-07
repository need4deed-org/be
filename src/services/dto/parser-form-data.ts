export function parseFormData<T, P>(data: T, parserFn: (data: T) => P): P {
  return parserFn(data);
}

export function parseFormData<T, P>(data: T, parserFn: (data: T) => P): P {
  // TODO: Add validation here
  return parserFn(data);
}

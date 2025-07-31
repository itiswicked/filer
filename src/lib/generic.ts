export function objectFromEntries<T extends Record<string, any>>(keyName: keyof T, collection: T[]): Record<string, T> {
  return Object.fromEntries(collection.map(item => [item[keyName], item]));
}
/** The Croatian messages must have exactly the English ones' keys and function signatures. */
export type Shape<T> = {
  [K in keyof T]: T[K] extends string ? string : T[K] extends (...args: infer A) => string ? (...args: A) => string : Shape<T[K]>;
};

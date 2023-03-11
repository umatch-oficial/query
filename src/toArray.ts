import entryToString from "./entryToString";

import type { Payload, Primitive } from "./index";
import type { Dictionary, OneOrArray } from "@umatch/utils";

/**
 * Converts conditions to arrays.
 *
 * If they are an object, also transforms the values using [toSQLValue()]{@link import('./toSQLValue').default}.
 *
 * @example
 * string     => [string]
 * [string]   => [string]
 * { id: 1 }  => ['id = 1']
 */
function toArray<T extends Payload | OneOrArray<Primitive>>(
  x?: T,
  entriesCallback?: (entry: [string, unknown]) => string,
): T extends null | undefined
  ? []
  : T extends Dictionary
  ? string[]
  : T extends unknown[]
  ? T
  : T[];
function toArray(
  x?: Payload | OneOrArray<Primitive>,
  entriesCallback: (entry: [string, unknown]) => string = entryToString(),
) {
  if (x == null) return [];
  if (x instanceof Array) return x;
  switch (typeof x) {
    case "string":
    case "boolean":
    case "number":
      return [x];
    default:
      return Object.entries(x).map(entriesCallback);
  }
}

export default toArray;

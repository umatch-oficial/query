import { Primitive } from "./index";

import type { DateTime } from "luxon";
import type { Moment } from "moment";

/**
 * Represents values as expected by Postgres.
 *
 * @example
 * string => 'string'
 * boolean => boolean
 * number => number
 * [string, number] => ('string', number)
 * Date => ISO date
 *
 * @throws if the value is not a [Primitive]{@link Primitive}
 */
export default function toSQLValue(x: unknown): string | boolean | number {
  if (x == null) {
    return "";
  }
  switch (typeof x) {
    case "string":
      return `'${x}'`;
    case "boolean":
    case "number":
      return x;
    default:
      break;
  }
  switch (x.constructor?.name) {
    case "Array":
      return `(${(x as Primitive[]).map(toSQLValue).join(",")})`;
    case "Date":
    case "Moment":
      return `'${(x as Date | Moment).toISOString()}'`;
    case "DateTime":
      return `'${(x as DateTime).toISO()}'`;
    default:
      throw new Error(`Unexpected type: ${x.constructor?.name ?? typeof x}`);
  }
}

import { isBoolean, isNumber, isString } from "@umatch/utils";

import RawValue from "./RawValue";

import type { DateTime } from "luxon";
import type { Moment } from "moment";

/** @typedef {import { Primitive } from "./index"} Primitive */

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
  if (x == null) return "";

  if (isBoolean(x) || isNumber(x)) return x;
  if (isString(x)) return `'${x}'`;

  switch (x.constructor?.name) {
    case "Array":
      return `(${(x as unknown[]).map(toSQLValue).join(", ")})`;
    case "Date":
    case "Moment":
      return `'${(x as Date | Moment).toISOString()}'`;
    case "DateTime":
      return `'${(x as DateTime).toISO()}'`;
    case "RawValue":
      return (x as RawValue).value;
    default:
      throw new Error(`Unexpected type: ${x.constructor?.name ?? typeof x}`);
  }
}

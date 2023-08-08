import {
  isBoolean,
  isNullOrUndefined,
  isNumber,
  isString,
  type Primitive,
} from "@umatch/utils";

import RawValue from "./RawValue";
import validateSQL from "./validateSQL";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Value } from "./index";
import type { DateTime } from "luxon";
import type { Moment } from "moment";

/**
 * Represents values as expected by Postgres.
 *
 * Validates strings using [validateSQL()]{@link import('./validateSQL').default}.
 *
 * @example
 * string => 'string'
 * boolean => boolean
 * number => number
 * [string, number] => ('string', number)
 * Date => 'ISO date'
 *
 * @throws {Error} if the value is not a [Value]{@link Value}
 */
export default function toSQLValue(x: unknown): Primitive {
  if (isNullOrUndefined(x)) return "";
  if (isBoolean(x) || isNumber(x)) return x;
  if (isString(x) && validateSQL(x)) return `'${x}'`;

  switch (x?.constructor?.name) {
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
      throw new Error(`Unexpected type: ${x?.constructor?.name ?? typeof x}`);
  }
}

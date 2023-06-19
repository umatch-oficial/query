import { isBoolean, isNumber, isNullOrUndefined, isString } from "@umatch/utils";

import RawValue from "./RawValue";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Primitive, JSPrimitive } from "./index";
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
 * Date => 'ISO date'
 *
 * @throws if the value is not a [Primitive]{@link Primitive} or [RawValue]{@link RawValue}
 */
export default function toSQLValue(x: unknown): JSPrimitive {
  if (isNullOrUndefined(x)) return "";
  if (isBoolean(x) || isNumber(x)) return x;
  if (isString(x)) return `'${x}'`;

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

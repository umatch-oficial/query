import { isPrimitive } from "@umatch/utils";
import { joinNonEmpty } from "@umatch/utils/array";

import getOperator from "./getOperator";
import toSQLValue from "./toSQLValue";

import type { Value } from "./index";

/**
 * Returns a function, that converts entries from Object.entries()
 * to strings.
 *
 * If an alias is given, properties are prefixed with it. Properties
 * that already have an operator are not transformed.
 *
 * @param {boolean} [transform = true] Whether to transform values with toSQLValue(). Default: true
 * @param {string} [alias] An alias to prefix properties
 *
 * @throws if transform is false and the value isn't a Primitive
 */
export default function entryToString(
  transform: boolean = true,
  alias?: string,
): (entry: [string, unknown]) => string {
  const prefix = alias ? `${alias}.` : "";
  return ([key, val]) => {
    const transformed = toSQLValue(val); // this ensures val is a Value
    const [operator, value] = getOperator(val as Value);
    let finalValue;
    if (transform && operator === null) {
      finalValue = transformed;
    } else {
      if (!isPrimitive(value)) throw new Error(`Unexpected type: ${typeof value}`);
      finalValue = value;
    }
    return joinNonEmpty([`${prefix}${key}`, operator ?? "=", finalValue], " ");
  };
}

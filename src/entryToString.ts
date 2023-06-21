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
 */
export default function entryToString(
  transform: boolean = true,
  alias?: string,
): (entry: [string, unknown]) => string {
  const prefix = alias ? `${alias}.` : "";
  return ([key, val]) => {
    const transformed = toSQLValue(val); // this ensures val is a Value
    const [operator, value] = getOperator(val as Value);
    return `${prefix}${key} ${operator ?? "="} ${
      transform && operator === null ? transformed : value
    }`;
  };
}

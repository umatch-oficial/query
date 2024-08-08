// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { isPrimitive, type Primitive } from '@umatch/utils';
import { joinNonEmpty } from '@umatch/utils/string';

import { getOperator } from './getOperator';
import { Or as OrClass } from './Or';
import { toSQLValue } from './toSQLValue';

import type { Value } from './Value';

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
 * @throws {Error} if any string value contains potential SQL injection vulnerabilities.
 * @throws {Error} if any value isn't a [Value]{@link Value} or an [Or]{@link OrClass}.
 * @throws {Error} if transform is false and any value isn't a [Primitive]{@link Primitive} or an [Or]{@link OrClass}.
 */
export function entryToString(
  transform: boolean = true,
  alias?: string,
): (entry: [string, unknown]) => string {
  const prefix = alias ? `${alias}.` : '';
  return ([key, val]) => {
    if (val instanceof OrClass) {
      val.conditions = val.conditions.map((condition) =>
        typeof condition === 'string' ? `${prefix}${key} ${condition}` : condition,
      );
      return val.toString(alias);
    }

    const transformed = toSQLValue(val); // this ensures val is a Value
    const [operator, value] = getOperator(val as Value);
    let finalValue;
    if (transform && operator === null) {
      finalValue = transformed;
    } else {
      if (!isPrimitive(value)) throw new Error(`Unexpected type: ${typeof value}`);
      finalValue = value;
    }
    return joinNonEmpty([`${prefix}${key}`, operator ?? '=', finalValue], ' ');
  };
}

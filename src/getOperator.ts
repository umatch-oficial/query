import { isString } from '@umatch/utils';

import type { Value } from './index';

export type Operator = '>=' | '<=' | '!=' | '>' | '<' | '=' | 'IS NULL';

/**
 * Returns a tuple of [operator, value], using the operator in the
 * input if there is one.
 *
 * @example
 * 3       => [null, 3]
 * '3'     => [null, '3']
 * '>3'    => ['>', '3']
 * 'a > 3' => Error
 * @throws {Error} if splitting on operators yields more than 2 parts
 */
export default function getOperator(value: Value): [Operator | null, Value] {
  if (value === null) return ['IS NULL', ''];
  if (!isString(value)) return [null, value];

  const split = value.split(/\s*(>=|<=|!=|>|<|=)\s*/).filter(Boolean);
  switch (split.length) {
    case 1:
      return [null, split[0]];
    case 2:
      return split as [Operator, Value];
    default:
      throw new Error(`Failed to get operator and value from expression '${value}'`);
  }
}

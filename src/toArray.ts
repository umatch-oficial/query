import entryToString from './entryToString';

import type { JoinPayload, Payload, Value } from './index';
import type { Dictionary, OneOrArray } from '@umatch/utils';

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
function toArray<T extends Payload | JoinPayload | OneOrArray<Value>>(
  x?: T,
  entriesCallback?: (entry: [string, unknown]) => string,
): T extends null | undefined
  ? []
  : T extends Dictionary
  ? readonly string[]
  : T extends readonly unknown[]
  ? T
  : readonly T[];
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
function toArray(
  x?: Payload | JoinPayload | OneOrArray<Value>,
  entriesCallback: (entry: [string, unknown]) => string = entryToString(),
): readonly unknown[] {
  if (x == null) return [];
  if (x instanceof Array) return x;
  switch (typeof x) {
    case 'string':
    case 'boolean':
    case 'number':
      return [x];
    default:
      return Object.entries(x).map(entriesCallback);
  }
}

export default toArray;

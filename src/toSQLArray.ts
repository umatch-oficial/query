import { toSQLValue } from './toSQLValue';

import type { Value } from './Value';

/**
 * Returns the array as a native Postgres array.
 */
export function toSQLArray(arr: Value[]): string {
  return `ARRAY[ ${arr.map(toSQLValue).join(', ')} ]`;
}

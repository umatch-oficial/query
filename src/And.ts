import { entryToString } from './entryToString';
import { Or } from './Or';
import { RawValue } from './RawValue';
import { validateSQL } from './validateSQL';

import type { Payload } from './index';

export type AndCondition = string | Payload | Or | RawValue;

/**
 * Class used to represent AND conditions.
 */
export class And {
  constructor(public conditions: ReadonlyArray<AndCondition>) {}

  /**
   * Returns the string representation of the AND conditions.
   *
   * Validates strings using [validateSQL()]{@link import('./validateSQL').validateSQL}.
   */
  public toString(alias?: string): string {
    return (
      '(' +
      this.conditions
        .map((condition) => {
          return typeof condition === 'string'
            ? validateSQL(condition)
            : condition instanceof Or
            ? condition.toString(alias)
            : condition instanceof RawValue
            ? condition.value
            : '(' +
              Object.entries(condition).map(entryToString(false, alias)).join(' AND ') +
              ')';
        })
        .join(' AND ') +
      ')'
    );
  }
}

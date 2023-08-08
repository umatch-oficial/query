import entryToString from "./entryToString";
import Or from "./Or";
import validateSQL from "./validateSQL";

import type { Payload } from "./index";

/**
 * Class used to represent AND conditions.
 */
export default class And {
  constructor(public conditions: (string | Payload | Or)[]) {}

  /**
   * Returns the string representation of the AND conditions.
   *
   * Validates strings using [validateSQL()]{@link import('./validateSQL').default}.
   */
  public toString(alias?: string): string {
    return (
      "(" +
      this.conditions
        .map((condition) => {
          return typeof condition === "string"
            ? validateSQL(condition)
            : condition instanceof Or
            ? condition.toString(alias)
            : "(" +
              Object.entries(condition).map(entryToString(false, alias)).join(" AND ") +
              ")";
        })
        .join(" AND ") +
      ")"
    );
  }
}

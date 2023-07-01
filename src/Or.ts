import entryToString from "./entryToString";
import validateSQL from "./validateSQL";

import type { Payload } from "./index";

/**
 * Class used to insert OR conditions in the query.
 */
export default class Or {
  constructor(public conditions: (string | Payload)[]) {}

  /**
   * Returns the string representation of the OR conditions.
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
            : "(" +
                Object.entries(condition).map(entryToString(false, alias)).join(" AND ") +
                ")";
        })
        .join(" OR ") +
      ")"
    );
  }
}

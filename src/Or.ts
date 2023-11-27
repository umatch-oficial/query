import And from "./And";
import entryToString from "./entryToString";
import RawValue from "./RawValue";
import validateSQL from "./validateSQL";

import type { Payload } from "./index";

/**
 * Class used to represent OR conditions.
 */
export default class Or {
  constructor(public conditions: (string | Payload | And | RawValue)[]) {}

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
            : condition instanceof And
            ? condition.toString(alias)
            : condition instanceof RawValue
            ? condition.value
            : "(" +
              Object.entries(condition).map(entryToString(false, alias)).join(" AND ") +
              ")";
        })
        .join(" OR ") +
      ")"
    );
  }
}

import entryToString from "./entryToString";

import type { Payload } from "./index";

/**
 * Class used to insert OR conditions in the query.
 */
export default class Or {
  constructor(public conditions: (string | Payload)[]) {}

  public toString(): string {
    return (
      "(" +
      this.conditions
        .map((condition) => {
          return typeof condition === "string"
            ? condition
            : "(" +
                Object.entries(condition).map(entryToString(false)).join(" AND ") +
                ")";
        })
        .join(" OR ") +
      ")"
    );
  }
}

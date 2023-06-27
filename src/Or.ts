import entryToString from "./entryToString";

import type { Payload } from "./index";

/**
 * Class used to insert OR conditions in the query.
 */
export default class Or {
  constructor(public conditions: (string | Payload)[]) {}

  public toString(alias?: string): string {
    return (
      "(" +
      this.conditions
        .map((condition) => {
          return typeof condition === "string"
            ? condition
            : "(" +
                Object.entries(condition).map(entryToString(false, alias)).join(" AND ") +
                ")";
        })
        .join(" OR ") +
      ")"
    );
  }
}

import { Primitive } from "./index";

export type Operator = ">=" | "<=" | "!=" | ">" | "<" | "=";

/**
 * Returns a tuple of [operator, value], using the operator in the
 * input if there is one.
 *
 * '=' is used if no operator is found.
 *
 * @example
 * 3       => ['=', 3]
 * '3'     => ['=', '3']
 * '>3'    => ['>', '3']
 * 'a > 3' => Error
 * @throws if splitting on operators yields more than 2 parts
 */
export default function getOperator(value: Primitive): [Operator, Primitive] {
  if (typeof value !== "string") {
    return ["=", value];
  }

  const split = value.split(/\s*(>=|<=|!=|>|<|=)\s*/).filter(Boolean);
  switch (split.length) {
    case 1:
      return ["=", split[0]];
    case 2:
      return split as [Operator, Primitive];
    default:
      throw new Error(`Failed to get operator and value from expression '${value}'`);
  }
}

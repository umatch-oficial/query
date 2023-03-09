import getOperator from "./getOperator";
import { Primitive } from "./index";
import toSQLValue from "./toSQLValue";

/**
 * Returns a function, that converts entries from Object.entries()
 * to strings.
 *
 * If a table name is given, prefixes conditions with the name or the
 * alias, if there is one.
 *
 * @param {boolean} [transform = true] Whether to transform values with toSQLValue(). Default: true
 * @param {string | null} [table] The name of the table
 */
export default function entryToString(
  transform: boolean = true,
  table: string | null = null,
): (entry: [string, Primitive]) => string {
  let prefix = "";
  if (table) {
    const alias = table.split(/ (as )?/i)[2];
    prefix = `${alias ?? table}.`;
  }
  return ([key, val]) => {
    const [operator, value] = getOperator(val);
    return `${prefix}${key} ${operator} ${transform ? toSQLValue(value) : value}`;
  };
}

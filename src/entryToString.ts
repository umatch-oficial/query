import getOperator from "./getOperator";
import getTableAndAlias from "./getTableAndAlias";
import { Primitive } from "./index";
import toSQLValue from "./toSQLValue";

/**
 * Returns a function, that converts entries from Object.entries()
 * to strings.
 *
 * If a table string is given, prefixes conditions with its alias
 * (present in the string or auto-generated).
 *
 * @param {boolean} [transform = true] Whether to transform values with toSQLValue(). Default: true
 * @param {string} [table] The name of the table
 */
export default function entryToString(
  transform: boolean = true,
  table?: string,
): (entry: [string, unknown]) => string {
  let prefix = "";
  if (table) {
    const [_, alias] = getTableAndAlias(table);
    prefix = `${alias ?? table}.`;
  }
  return ([key, val]) => {
    const transformed = toSQLValue(val); // this ensures val is a Primitive
    const [operator, value] = getOperator(val as Primitive);
    return `${prefix}${key} ${operator} ${transform ? transformed : value}`;
  };
}

/**
 * Returns the table name and alias.
 *
 * If there isn't already an alias for the table, makes one out of
 * the table name using the makeAlias function.
 *
 * @param tableString A string that contains the name of a table and optionally an alias for it.
 * @param makeAlias A function that makes an alias out of a table's name. Default: first three letters.
 *
 * @example
 * // ['users', 'u']
 * getTableAndAlias('users as u')
 * // ['images', 'im']
 * getTableAndAlias('images im')
 * // ['documents', 'doc']
 * getTableAndAlias('documents')
 * // ['users', 'u']
 * getTableAndAlias('users', (name: string) => name[0]))
 */
export default function getTableAndAlias(
  tableString: string,
  makeAlias: (name: string) => string = (name: string) => name.slice(0, 3),
): [string, string] {
  const [tableName, alias] = tableString.split(/ (as )?/i, 2);
  if (alias) return [tableName, alias];
  return [tableName, makeAlias(tableName)];
}

import {
  isPlainObject,
  isPrimitive,
  isString,
  type Dictionary,
  type OneOrArray,
  type Primitive,
} from "@umatch/utils";
import { joinNonEmpty } from "@umatch/utils/array";
import { deepClone } from "@umatch/utils/object";

import entryToString from "./entryToString";
import getTableAndAlias from "./getTableAndAlias";
import RawValue from "./RawValue";
import toArray from "./toArray";
import toSQLValue from "./toSQLValue";

import type { Operator } from "./getOperator";
import type { DateTime } from "luxon";
import type { Moment } from "moment";

export type Value = Primitive | Date | DateTime | Moment | RawValue;
export type Payload = Dictionary<Value>;
export type JoinPayload = Dictionary<Primitive>;
export type Conditions = {
  select?: OneOrArray<string>;
  from?: string | Query;
  alias?: string;
  join?: string[];
  where?: OneOrArray<string> | Payload;
  groupBy?: OneOrArray<string>;
  having?: OneOrArray<string>;
  orderBy?: OneOrArray<string>;
  limit?: number;
  offset?: number;
  trx?: any;
};
export { toSQLValue };

export function isValue(obj: unknown): obj is Value {
  if (obj === null) return true;
  if (isPrimitive(obj)) return true;

  return ["Date", "DateTime", "Moment", "RawValue"].includes(obj?.constructor.name!);
}

const queryPropertyNamesAndDefaultValues = {
  with: ["_withs", []],
  select: ["_selects", []],
  from: ["_from", ""],
  alias: ["_alias", "sub"],
  join: ["_joins", []],
  where: ["_wheres", []],
  groupBy: ["_groups", []],
  having: ["_havings", []],
  orderBy: ["_orders", []],
  limit: ["_limit", undefined],
  offset: ["_offset", undefined],
  trx: ["_trx", undefined],
};
type QueryProperty = keyof typeof queryPropertyNamesAndDefaultValues;

export class Query<Result = unknown> {
  private _withs: string[];
  private _selects: string[];
  private _from: string;
  private _alias: string;
  private _joins: string[];
  private _wheres: string[];
  private _groups: string[];
  private _havings: string[];
  private _orders: string[];
  private _limit?: number;
  private _offset?: number;
  private _trx?: any;

  constructor(conditions?: Conditions) {
    const {
      select,
      from,
      alias,
      join,
      where,
      groupBy,
      having,
      orderBy,
      limit,
      offset,
      trx,
    } = conditions ?? {};
    this._withs = [];
    this._selects = toArray(select);
    this._from = from ? (isString(from) ? from : Query._parseSubquery(from)) : "";
    this._alias = alias ?? queryPropertyNamesAndDefaultValues["alias"][1];
    this._joins = toArray(join);
    this._wheres = toArray(where);
    this._groups = toArray(groupBy);
    this._havings = toArray(having);
    this._orders = toArray(orderBy);
    this._limit = limit;
    this._offset = offset;
    this._trx = trx;
    this._run = Query._run?.bind(this);
  }

  /**
   * Returns the query as a string to use inside another query.
   */
  private static _parseSubquery(query: Query): string {
    return `(\n${query.build()}\n) AS ${query._alias}`;
  }

  public static getTableAndAlias = getTableAndAlias;

  /**
   * Wraps a value so that it doesn't get transformed.
   *
   * Use this method to produce raw SQL, which should not be pre-processed
   * by the query builder.
   *
   * @example
   * query.where("created_at", ">", Query.raw("NOW() - INTERVAL '1 day'"))
   */
  public static raw(value: Primitive): RawValue {
    return new RawValue(value);
  }

  /**
   * Adds a 'with' clause.
   */
  public with(query: string | Query, alias?: string): this {
    let _alias;
    let _query;
    if (isString(query)) {
      _alias = alias ?? queryPropertyNamesAndDefaultValues["alias"][1];
      _query = query;
    } else {
      _alias = query._alias;
      _query = query.build();
    }
    this._withs.push(`${_alias} AS (\n${_query}\n)`);
    return this;
  }

  /**
   * Adds a field to the 'select' clause.
   */
  public select(field: string): this;
  /**
   * Adds fields to the 'select' clause.
   */
  public select(fields: string[]): this;
  /**
   * Adds one or more fields to the 'select' clause.
   */
  public select(fields: OneOrArray<string>): this {
    const _fields = toArray(fields);
    _fields.forEach((field) => this._selects.push(field));
    return this;
  }

  /**
   * Sets the 'from' table.
   *
   * @throws if the table has already been set
   */
  public from(table: string): this;
  /**
   * Sets the 'from' table.
   *
   * @throws if the table has already been set
   */
  public from(query: Query): this;
  /**
   * Sets the 'from' table.
   *
   * @throws if the table has already been set
   */
  public from(from: string | Query): this {
    if (this._from) throw new Error("Query already has 'from'");
    this._from = isString(from) ? from : Query._parseSubquery(from);
    return this;
  }

  /**
   * Sets the alias that will be used in case this query becomes a subquery.
   */
  public as(alias: string): this {
    this._alias = alias;
    return this;
  }

  /**
   * Sets the alias that will be used in case this query becomes a subquery.
   */
  public alias(alias: string): this {
    this._alias = alias;
    return this;
  }

  /**
   * Adds a join clause.
   *
   * If 'table' is a Query, it is parsed to a subquery string.
   */
  private _join(
    joinType: "LEFT" | "INNER" | "OUTER",
    table: string | Query,
    on: string[] | JoinPayload,
  ): void {
    let tableAlias: string;
    let tableName: string;
    let joinTable: string;
    if (isString(table)) {
      [tableName, tableAlias] = getTableAndAlias(table);
      joinTable = `${tableName} AS ${tableAlias}`;
    } else {
      tableAlias = table._alias;
      joinTable = Query._parseSubquery(table);
    }

    const ons = toArray(on, entryToString(false, tableAlias));
    const clause = `${joinType} JOIN ${joinTable} ON ${ons.join(" AND ")}`;
    this.joinRaw(clause);
  }

  /**
   * Adds an inner join.
   *
   * Parses arrays of conditions, but does not transform values.
   */
  public innerJoin(table: string | Query, on: string[] | JoinPayload): this {
    this._join("INNER", table, on);
    return this;
  }

  /**
   * Adds a left join.
   *
   * Parses arrays of conditions, but does not transform values.
   */
  public leftJoin(table: string | Query, on: string[] | JoinPayload): this {
    this._join("LEFT", table, on);
    return this;
  }

  /**
   * Adds an outer join.
   *
   * Parses arrays of conditions, but does not transform values.
   */
  public outerJoin(table: string | Query, on: string[] | JoinPayload): this {
    this._join("OUTER", table, on);
    return this;
  }

  /**
   * Removes rows, which join on the conditions.
   */
  public excludeJoin(table: string, conditions: JoinPayload): this {
    const alias = `exclude_${table}`;
    // the column to exclude MUST be one of the joined columns, god knows why.
    const [excludeColumn] = Object.keys(conditions);
    this._join("LEFT", `${table} AS ${alias}`, conditions);
    this.whereRaw(`${alias}.${excludeColumn} IS NULL`);
    return this;
  }

  /**
   * Adds a join clause without parsing or transforming conditions.
   */
  public joinRaw(clause: string): this;
  /**
   * Adds join clauses without parsing or transforming conditions.
   */
  public joinRaw(clauses: string[]): this;
  /**
   * Adds one or more join clauses without parsing or transforming conditions.
   */
  public joinRaw(clauses: OneOrArray<string>): this {
    const joins = toArray(clauses);
    joins.forEach((join) => this._joins.push(join));
    return this;
  }

  /**
   * Adds 'where' conditions.
   *
   * Iterates over entries, adding one condition per entry.
   */
  public where(conditions: Payload): this;
  /**
   * Adds a 'where' condition.
   *
   * Transforms the value using [toSQLValue()]{@link toSQLValue}.
   */
  public where(field: string, value: Value): this;
  /**
   * Adds a 'where' condition.
   *
   * Transforms the value using [toSQLValue()]{@link toSQLValue}.
   */
  public where(field: string, operator: Operator, value: Value): this;
  /**
   * Adds one or more 'where' conditions.
   *
   * If given a dictionary, iterates over entries, adding one condition per entry.<br>
   * If given a string and a value, transforms the value using [toSQLValue()]{@link toSQLValue}.<br>
   * If given two strings and a value, uses the second string as the operator.
   */
  public where(
    fieldOrConditions: string | Payload,
    valueOrOperator?: Value | Operator,
    value?: Value,
  ): this {
    if (value === undefined) {
      if (valueOrOperator === undefined) {
        // case 1
        if (!isPlainObject(fieldOrConditions)) throw new Error("payload must be an object");

        const wheres = toArray(fieldOrConditions);
        wheres.forEach((where) => this._wheres.push(where));
        return this;
      } else {
        // case 2
        if (!isString(fieldOrConditions)) throw new Error("field must be a string");
        if (!isValue(valueOrOperator)) throw new Error("value must be a Primitive");

        const condition =
          valueOrOperator === null
            ? `${fieldOrConditions} IS NULL`
            : `${fieldOrConditions} = ${toSQLValue(valueOrOperator)}`;
        this._wheres.push(condition);
        return this;
      }
    }

    // case 3
    if (!isString(fieldOrConditions)) throw new Error("field must be a string");
    if (!isString(valueOrOperator)) throw new Error("operator must be a string");
    if (!isValue(valueOrOperator)) throw new Error("value must be a Primitive");
    if (value === null) {
      throw new Error(
        "Attempted comparison with null!\nThis is often an error. If it was intended, use whereRaw instead.",
      );
    }

    this._wheres.push(`${fieldOrConditions} ${valueOrOperator} ${toSQLValue(value)}`);
    return this;
  }

  /**
   * Adds a 'where between' condition.
   *
   * Transforms min and max using [toSQLValue()]{@link toSQLValue}.
   */
  public whereBetween(field: string, [min, max]: (number | DateTime)[]): this {
    this._wheres.push(`${field} BETWEEN ${toSQLValue(min)} AND ${toSQLValue(max)}`);
    return this;
  }

  /**
   * Adds 'where in' conditions.
   *
   * Iterates over entries, adding one condition per entry.
   */
  public whereIn(conditions: Dictionary<Value[]>): this;
  /**
   * Adds a 'where in' condition.
   *
   * Transforms the array of values using [toSQLValue()]{@link toSQLValue}.
   */
  public whereIn(field: string, values: Value[]): this;
  /**
   * Adds one or more 'where in' conditions.
   *
   * If given a dictionary, iterates over entries, adding one condition per entry.<br>
   * If given a string and an array, transforms the array of values using [toSQLValue()]{@link toSQLValue}.
   */
  public whereIn(
    fieldOrConditions: string | Dictionary<Value[]>,
    values?: Value[],
  ): this {
    if (values) {
      this._wheres.push(`${fieldOrConditions} IN ${toSQLValue(values)}`);
    } else {
      if (isString(fieldOrConditions)) throw new Error("Missing values");
      Object.entries(fieldOrConditions).forEach(
        ([field, vals]) => this.whereIn(field, vals),
        this,
      );
    }
    return this;
  }

  /**
   * Adds 'where not in' conditions.
   *
   * Iterates over entries, adding one condition per entry.
   */
  public whereNotIn(condition: Dictionary<Value[]>): this;
  /**
   * Adds a 'where not in' condition.
   *
   * Transforms the array of values using [toSQLValue()]{@link toSQLValue}.
   */
  public whereNotIn(field: string, values: Value[]): this;
  /**
   * Adds one or more 'where not in' conditions.
   *
   * If given a dictionary, iterates over entries, adding one condition per entry.<br>
   * If given a string and an array, transforms the array of values using [toSQLValue()]{@link toSQLValue}.
   */
  public whereNotIn(
    fieldOrConditions: string | Dictionary<Value[]>,
    values?: Value[],
  ): this {
    if (values) {
      this._wheres.push(`${fieldOrConditions} NOT IN ${toSQLValue(values)}`);
    } else {
      if (isString(fieldOrConditions)) throw new Error("Missing values");
      Object.entries(fieldOrConditions).forEach(
        ([field, vals]) => this.whereNotIn(field, vals),
        this,
      );
    }
    return this;
  }

  /**
   * Adds a 'where null' condition.
   */
  public whereNull(field: string): this;
  /**
   * Adds 'where null' conditions.
   */
  public whereNull(fields: string[]): this;
  /**
   * Adds one or more 'where null' conditions.
   */
  public whereNull(fields: OneOrArray<string>): this {
    toArray(fields).forEach((field) => this._wheres.push(`${field} IS NULL`));
    return this;
  }

  /**
   * Adds a 'where not null' condition.
   */
  public whereNotNull(field: string): this;
  /**
   * Adds 'where not null' conditions.
   */
  public whereNotNull(fields: string[]): this;
  /**
   * Adds one or more 'where not null' conditions.
   */
  public whereNotNull(fields: OneOrArray<string>): this {
    toArray(fields).forEach((field) => this._wheres.push(`${field} IS NOT NULL`));
    return this;
  }

  /**
   * Adds a 'where' condition without transforming values.
   */
  public whereRaw(clause: string): this;
  /**
   * Adds 'where' conditions without transforming values.
   */
  public whereRaw(clauses: string[]): this;
  /**
   * Adds one or more 'where' conditions without transforming values.
   */
  public whereRaw(clauses: OneOrArray<string>): this {
    const wheres = toArray(clauses, entryToString(false));
    wheres.forEach((where) => this._wheres.push(where));
    return this;
  }

  /**
   * Adds a column to the 'group by' clause.
   */
  public groupBy(field: string): this;
  /**
   * Adds columns to the 'group by' clause.
   */
  public groupBy(fields: string[]): this;
  /**
   * Adds one or more columns to the 'group by' clause.
   */
  public groupBy(fields: OneOrArray<string>): this {
    toArray(fields).forEach((field) => this._groups.push(field));
    return this;
  }

  /**
   * Adds a condition to the 'having' clause.
   */
  public having(condition: string): this;
  /**
   * Adds conditions to the 'having' clause.
   */
  public having(conditions: string[]): this;
  /**
   * Adds one or more conditions to the 'having' clause.
   */
  public having(conditions: OneOrArray<string>): this {
    toArray(conditions).forEach((condition) => this._havings.push(condition));
    return this;
  }

  /**
   * Adds a column to the 'order by' clause.
   */
  public orderBy(column: string, order: "asc" | "desc"): this {
    this._orders.push(order ? `${column} ${order}` : column);
    return this;
  }

  /**
   * Sets the limit.
   *
   * @throws if the limit has already been set
   */
  public limit(value: number): this {
    if (this._limit) throw new Error("Query already has limit");
    this._limit = value;
    return this;
  }

  /**
   * Sets the offset.
   *
   * @throws if the offset has already been set
   */
  public offset(value: number): this {
    if (this._offset) throw new Error("Query already has offset");
    this._offset = value;
    return this;
  }

  /**
   * Sets the transaction.
   *
   * @throws if the transaction has already been set
   */
  public trx(trx: any): this {
    if (this._trx) throw new Error("Query already has transaction");
    this._trx = trx;
    return this;
  }

  /**
   * Adds a limit and an offset to simulate pagination.
   */
  public forPage(page = 1, pageSize = 10): this {
    if (page > 1) {
      this.offset((page - 1) * pageSize);
    }
    this.limit(pageSize);
    return this;
  }

  /**
   * Clear properties from the query.
   */
  public clear(properties: OneOrArray<QueryProperty>): this {
    toArray(properties).forEach((prop) => {
      const [key, defaultValue] = queryPropertyNamesAndDefaultValues[prop];
      // @ts-expect-error
      this[key] = deepClone(defaultValue);
    });
    return this;
  }

  /**
   * Returns a copy of the current query.
   */
  public clone(exclude: QueryProperty[] = []): Query {
    const newQuery = new Query();
    // @ts-expect-error
    Object.entries(this).forEach(([key, value]) => (newQuery[key] = deepClone(value)));
    // remove some properties
    newQuery.clear(exclude);
    return newQuery;
  }

  /**
   * Joins an array of clause parts using the specified separator (or uses a single
   * provided clause) and adds the clause name to the beginning, returning a final
   * string that can be used in a query.
   *
   * @example
   * // returns ''
   * this._buildClauseString([], 'WHERE', ' AND ')
   * // returns 'WHERE a = 1'
   * this._buildClauseString(['a = 1'], 'WHERE', ' AND ')
   * // returns 'WHERE a = 1 AND b = 2'
   * this._buildClauseString(['a = 1', 'b = 2'], 'WHERE', ' AND ')
   */
  private _buildClauseString(
    conditions: (string | number)[] | undefined,
    name: string,
    separator: string = ",\n  ",
  ): string {
    const joinedConditions = joinNonEmpty(conditions, separator);
    if (!joinedConditions) return "";
    return joinNonEmpty([name, joinedConditions], " ");
  }

  /**
   * Returns the final query.
   */
  public build(): string {
    if (!this._from) throw new Error("Cannot build query missing 'from'!");
    if (this._havings.length > 0 && this._groups.length === 0) {
      throw new Error("Cannot build query with 'having', but missing 'group by'");
    }

    return joinNonEmpty(
      [
        this._buildClauseString(this._withs, "WITH", ",\n"),
        `SELECT ${this._selects?.join(",\n  ") || "*"}`,
        `FROM ${this._from}`,
        this._buildClauseString(this._joins, "", "\n"),
        this._buildClauseString(this._wheres, "WHERE", "\n  AND "),
        this._buildClauseString(this._groups, "GROUP BY"),
        this._buildClauseString(this._havings, "HAVING"),
        this._buildClauseString(this._orders, "ORDER BY"),
        this._limit ? `LIMIT ${this._limit}` : "",
        this._offset ? `OFFSET ${this._offset}` : "",
      ],
      "\n",
    );
  }

  /**
   * The method that is used to run queries.
   */
  static _run?: (query: string) => Promise<unknown>;
  private _run?: (query: string) => Promise<unknown>;

  /**
   * Sets the method, that will be used to run queries.
   */
  static init(func: (query: string) => Promise<unknown>): void {
    this._run = func;
  }

  /**
   * Builds and runs the query, returning the result.
   *
   * @throws if the 'init' method hasn't been called
   */
  async run(): Promise<Result[]> {
    if (!this._run) throw new Error("Cannot run without executing Query.init()");

    const query = this.build();
    return (await this._run(query)) as Promise<Result[]>;
  }
}

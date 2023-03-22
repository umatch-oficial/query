import { isJSObject, isString } from "@umatch/utils";
import { apply, remove, rename } from "@umatch/utils/object";

import entryToString from "./entryToString";
import getTableAndAlias from "./getTableAndAlias";
import RawValue from "./RawValue";
import toArray from "./toArray";
import toSQLValue from "./toSQLValue";

import type { Operator } from "./getOperator";
import type { Dictionary, OneOrArray } from "@umatch/utils";
import type { DateTime } from "luxon";
import type { Moment } from "moment";

export type JSPrimitive = boolean | number | string;
export type Primitive = JSPrimitive | Date | DateTime | Moment;
export type Payload = Dictionary<Primitive>;
export type Conditions = {
  alias?: string;
  select?: OneOrArray<string>;
  from?: string | Query;
  join?: string[];
  where?: OneOrArray<string> | Payload;
  groupBy?: OneOrArray<string>;
  having?: OneOrArray<string>;
  orderBy?: OneOrArray<string>;
  limit?: number;
  offset?: number;
  trx?: any;
};

export function isPrimitive(obj: unknown): obj is Primitive {
  const isJSPrimitive = ["string", "boolean", "number"].includes(typeof obj);
  if (isJSPrimitive) return true;

  return ["Date", "DateTime", "Moment"].includes(obj?.constructor.name!);
}

// Mapping from private property names to keys of Conditions
const PROPERTY_TO_CONDITION: { [_: string]: keyof Conditions } = {
  _alias: "alias",
  _selects: "select",
  _from: "from",
  _joins: "join",
  _wheres: "where",
  _groups: "groupBy",
  _havings: "having",
  _orders: "orderBy",
  _limit: "limit",
  _offset: "offset",
  _trx: "trx",
};

export class Query<Result = unknown> {
  private _alias: string;
  private _selects: string[];
  private _from: string;
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
      alias,
      select,
      from,
      join,
      where,
      groupBy,
      having,
      orderBy,
      limit,
      offset,
      trx,
    } = conditions ?? {};
    this._alias = alias ?? "sub";
    this._selects = toArray(select);
    this._from = from
      ? typeof from === "string"
        ? from
        : Query._parseSubquery(from)
      : "";
    this._joins = toArray(join);
    this._wheres = toArray(where);
    this._groups = toArray(groupBy);
    this._havings = toArray(having);
    this._orders = toArray(orderBy);
    this._limit = limit;
    this._offset = offset;
    this._trx = trx;
  }

  /**
   * Returns a string of the query to use inside another query.
   */
  private static _parseSubquery(query: Query): string {
    return `(${query.build()}) AS ${query._alias}`;
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
  public static raw(value: JSPrimitive): RawValue {
    return new RawValue(value);
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
   * Adds one or more fields to the 'select' clause.
   */
  public select(clause: OneOrArray<string>): this {
    const fields = toArray(clause);
    fields.forEach((field) => this._selects.push(field), this);
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
    this._from = typeof from === "string" ? from : Query._parseSubquery(from);
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
    on: string[] | Payload,
  ): void {
    let tableAlias: string;
    let tableName: string;
    let joinTable: string;
    if (typeof table === "string") {
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
  public innerJoin(table: string | Query, on: string[] | Payload): this {
    this._join("INNER", table, on);
    return this;
  }

  /**
   * Adds a left join.
   *
   * Parses arrays of conditions, but does not transform values.
   */
  public leftJoin(table: string | Query, on: string[] | Payload): this {
    this._join("LEFT", table, on);
    return this;
  }

  /**
   * Adds an outer join.
   *
   * Parses arrays of conditions, but does not transform values.
   */
  public outerJoin(table: string | Query, on: string[] | Payload): this {
    this._join("OUTER", table, on);
    return this;
  }

  /**
   * Removes rows, which join on the conditions.
   */
  public excludeJoin(table: string, conditions: Payload): this {
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
  public joinRaw(clause: string): this {
    this._joins.push(clause);
    return this;
  }

  /**
   * Adds 'where' conditions.
   *
   * Iterates over entries, adding one condition per entry.
   */
  public where(payload: Payload): this;
  /**
   * Adds a 'where' condition.
   *
   * Transforms the value using [toSQLValue()]{@link toSQLValue}.
   */
  public where(field: string, value: Primitive): this;
  /**
   * Adds a 'where' condition.
   *
   * Transforms the value using [toSQLValue()]{@link toSQLValue}.
   */
  public where(field: string, operator: Operator, value: Primitive): this;
  /**
   * Adds a 'where' condition.
   *
   * If given a dictionary, iterates over entries, adding one condition per entry.<br>
   * If given a string and a value, transforms the value using [toSQLValue()]{@link toSQLValue}.<br>
   * If given two strings and a value, uses the second string as the operator.
   */
  public where(
    fieldOrClauses: string | Payload,
    valueOrOperator?: Primitive | Operator,
    value?: Primitive,
  ): this {
    if (value === undefined) {
      if (valueOrOperator === undefined) {
        // case 1
        if (!isJSObject(fieldOrClauses)) throw new Error("payload must be an object");

        const wheres = toArray(fieldOrClauses);
        wheres.forEach((where) => this._wheres.push(where), this);
        return this;
      } else {
        // case 2
        if (!isString(fieldOrClauses)) throw new Error("field must be a string");
        if (!isPrimitive(valueOrOperator)) throw new Error("value must be a Primitive");

        this._wheres.push(`${fieldOrClauses} = ${toSQLValue(valueOrOperator)}`);
        return this;
      }
    }

    // case 3
    if (!isString(fieldOrClauses)) throw new Error("field must be a string");
    if (!isString(valueOrOperator)) throw new Error("operator must be a string");
    if (!isPrimitive(valueOrOperator)) throw new Error("value must be a Primitive");

    this._wheres.push(`${fieldOrClauses} ${valueOrOperator} ${toSQLValue(value)}`);
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
  public whereIn(clause: Dictionary<Primitive[]>): this;
  /**
   * Adds a 'where in' condition.
   *
   * Transforms the array of values using [toSQLValue()]{@link toSQLValue}.
   */
  public whereIn(field: string, values: Primitive[]): this;
  /**
   * Adds a 'where in' condition.
   *
   * If given a dictionary, iterates over entries, adding one condition per entry.<br>
   * If given a string and an array, transforms the array of values using [toSQLValue()]{@link toSQLValue}.
   */
  public whereIn(
    fieldOrClause: string | Dictionary<Primitive[]>,
    values?: Primitive[],
  ): this {
    if (values) {
      this._wheres.push(`${fieldOrClause} IN ${toSQLValue(values)}`);
    } else {
      if (typeof fieldOrClause === "string") throw new Error("Missing values");
      Object.entries(fieldOrClause).forEach(
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
  public whereNotIn(clause: Dictionary<Primitive[]>): this;
  /**
   * Adds a 'where not in' condition.
   *
   * Transforms the array of values using [toSQLValue()]{@link toSQLValue}.
   */
  public whereNotIn(field: string, values: Primitive[]): this;
  /**
   * Adds a 'where not in' condition.
   *
   * If given a dictionary, iterates over entries, adding one condition per entry.<br>
   * If given a string and an array, transforms the array of values using [toSQLValue()]{@link toSQLValue}.
   */
  public whereNotIn(
    fieldOrClause: string | Dictionary<Primitive[]>,
    values?: Primitive[],
  ): this {
    if (values) {
      this._wheres.push(`${fieldOrClause} NOT IN ${toSQLValue(values)}`);
    } else {
      if (typeof fieldOrClause === "string") throw new Error("Missing values");
      Object.entries(fieldOrClause).forEach(
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
   * Adds 'where null' conditions.
   */
  public whereNull(fields: OneOrArray<string>): this {
    toArray(fields).forEach((field) => this._wheres.push(`${field} IS NULL`), this);
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
   * Adds 'where not null' conditions.
   */
  public whereNotNull(fields: OneOrArray<string>): this {
    toArray(fields).forEach((field) => this._wheres.push(`${field} IS NOT NULL`), this);
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
   * Adds 'where' conditions without transforming values.
   */
  public whereRaw(clauses: OneOrArray<string>): this {
    const wheres = toArray(clauses, entryToString(false));
    wheres.forEach((where) => this._wheres.push(where), this);
    return this;
  }

  /**
   * Adds a column to the 'group by' clause.
   */
  public groupBy(fields: OneOrArray<string>): this {
    toArray(fields).forEach((field) => this._groups.push(field));
    return this;
  }

  /**
   * Adds a column to the 'having' clause.
   */
  public having(fields: OneOrArray<string>): this {
    toArray(fields).forEach((field) => this._havings.push(field));
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
    this.limit(page * pageSize);
    return this;
  }

  /**
   * Returns a copy of the current query.
   */
  public clone(exclude?: (keyof Conditions)[]): Query {
    const copiedProperties = { ...this } as unknown as Dictionary;
    // rename properties to match the constructor names
    let conditionsObject = rename(copiedProperties, PROPERTY_TO_CONDITION);
    // remove some properties
    if (exclude) remove(conditionsObject, exclude);
    // duplicate arrays, otherwise their references get passed along
    conditionsObject = apply(conditionsObject, (value) => {
      return Array.isArray(value) ? [...value] : value;
    });
    return new Query(conditionsObject as Conditions);
  }

  /**
   * Joins an array of clause strings using the specified separator (or uses a single
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
    clauses: OneOrArray<string | number> | undefined,
    name: string,
    separator: string = ",\n  ",
  ): string {
    if (Array.isArray(clauses)) {
      return clauses.length > 0 ? `${name} ${clauses.join(separator)}` : "";
    }
    return clauses ? `${name} ${clauses}` : "";
  }

  /**
   * Returns the final query.
   */
  public build(): string {
    if (!this._from) throw new Error("Cannot build query missing 'from'!");
    if (this._havings.length > 0 && this._groups.length === 0) {
      throw new Error("Cannot build query with 'having', but missing 'group by'");
    }

    return [
      `SELECT ${this._selects?.join(",\n  ") || "*"}`,
      `FROM ${this._from}`,
      this._buildClauseString(this._joins, "", "\n"),
      this._buildClauseString(this._wheres, "WHERE", "\n  AND "),
      this._buildClauseString(this._groups, "GROUP BY"),
      this._buildClauseString(this._havings, "HAVING"),
      this._buildClauseString(this._orders, "ORDER BY"),
      this._buildClauseString(this._limit, "LIMIT"),
      this._buildClauseString(this._offset, "OFFSET"),
    ]
      .filter((part) => !!part)
      .join("\n");
  }

  /**
   * The method that is used to run queries.
   */
  static _run?: (query: string) => Promise<unknown>;

  /**
   * Sets the method, that will be used to run queries.
   */
  static init(func: () => Promise<unknown>): void {
    this._run = func.bind(this);
  }

  /**
   * Builds and runs the query, returning the result.
   *
   * @throws if the 'init' method hasn't been called
   */
  async run(): Promise<Result[]> {
    if (!Query._run) throw new Error("Cannot run without executing Query.init()");

    const query = this.build();
    return (await Query._run(query)) as Promise<Result[]>;
  }
}

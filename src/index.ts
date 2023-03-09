import { Dictionary } from "@umatch/utils";
import { apply, remove, rename, isPlainObject } from "@umatch/utils/object";

import entryToString from "./entryToString";
import toArray from "./toArray";
import toSQLValue from "./toSQLValue";

import type { Operator } from "./getOperator";
import type { DateTime } from "luxon";
import type { Moment } from "moment";

export type Primitive = boolean | number | string | Date | DateTime | Moment;
export type Payload = Dictionary<Primitive>;
export type OneOrArray<T = unknown> = T | T[];
export type AsArray<T> = T extends unknown[] ? T : T[];
export type QueryAs = {
  query: Query;
  alias: string;
};
export type Conditions = {
  select?: OneOrArray<string>;
  from?: string | QueryAs;
  join?: (string | QueryAs)[];
  where?: OneOrArray<string> | Payload;
  groupBy?: OneOrArray<string>;
  having?: OneOrArray<string>;
  orderBy?: OneOrArray<string>;
  limit?: number;
  offset?: number;
  trx?: any;
};

function isString(obj: unknown): obj is string {
  return typeof obj === "string";
}

function isPrimitive(obj: unknown): obj is Primitive {
  const isJSPrimitive = ["string", "boolean", "number"].includes(typeof obj);
  if (isJSPrimitive) return true;

  return ["Date", "DateTime", "Moment"].includes(obj?.constructor.name as string);
}

export default class Query<Result = unknown> {
  private _selects: string[];
  private _from: string | QueryAs;
  private _joins: (string | QueryAs)[];
  private _wheres: string[];
  private _groups: string[];
  private _havings: string[];
  private _orders: string[];
  private _limit?: number;
  private _offset?: number;
  private _trx?: any;
  private static propertyToCondition = {
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

  constructor(conditions?: Conditions) {
    const { select, from, join, where, groupBy, having, orderBy, limit, offset, trx } =
      conditions ?? {};
    this._selects = toArray(select);
    this._from = from ?? "";
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
  public from(query: QueryAs): this;
  /**
   * Sets the 'from' table.
   *
   * @throws if the table has already been set
   */
  public from(from: string | QueryAs): this {
    if (this._from) throw new Error("Query already has 'from'");
    this._from = from;
    return this;
  }

  private _join(
    joinType: "LEFT" | "INNER" | "OUTER",
    table: string,
    on: string[] | Payload,
  ): void {
    const ons = toArray(on, entryToString(false, table));
    const clause = `${joinType} JOIN ${table} ON ${ons.join(" AND ")}`;
    this.joinRaw(clause);
  }

  /**
   * Adds an inner join.
   *
   * Parses arrays of conditions, but does not transform values.
   */
  public innerJoin(table: string, on: string[] | Payload): this {
    this._join("INNER", table, on);
    return this;
  }

  /**
   * Adds a left join.
   *
   * Parses arrays of conditions, but does not transform values.
   */
  public leftJoin(table: string, on: string[] | Payload): this {
    this._join("LEFT", table, on);
    return this;
  }

  /**
   * Adds an outer join.
   *
   * Parses arrays of conditions, but does not transform values.
   */
  public outerJoin(table: string, on: string[] | Payload): this {
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
  public joinRaw(join: string): this;
  public joinRaw(query: QueryAs): this;
  public joinRaw(clause: string | QueryAs): this {
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
   * If given a dictionary, iterates over entries, adding one condition per entry.
   * If given a string and a value, transforms the value using [toSQLValue()]{@link toSQLValue}.
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
        if (!isPlainObject(fieldOrClauses)) throw new Error("payload must be an object");

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
   * If given a dictionary, iterates over entries, adding one condition per entry.
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
   * If given a dictionary, iterates over entries, adding one condition per entry.
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
   * Returns a special object to be used as a sub-query in
   * the 'from' or 'join' argument of a new query.
   * @param alias
   */
  public as(alias = "q"): QueryAs {
    return {
      query: this,
      alias,
    };
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
  public clone(exclude: string[]): Query {
    const copiedProperties = { ...this } as unknown as Dictionary;
    // rename properties to match the constructor names
    let conditionsObject = rename(copiedProperties, Query.propertyToCondition);
    // remove some properties
    if (exclude) remove(conditionsObject, exclude);
    // duplicate arrays, otherwise their references get passed along
    conditionsObject = apply(conditionsObject, (value) => {
      return Array.isArray(value) ? [...value] : value;
    });
    return new Query(conditionsObject);
  }

  private _parseSubquery(value: string | QueryAs): string {
    if (typeof value === "string") return value;
    return `(${value.query.build()}) AS ${value.alias}`;
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

    const _from = this._parseSubquery(this._from);
    const _joins = this._joins.map(this._parseSubquery);

    return [
      `SELECT ${this._selects?.join(",\n  ") || "*"}`,
      `FROM ${_from}`,
      this._buildClauseString(_joins, "", "\n"),
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

  static _run?: (query: string) => Promise<unknown>;

  /**
   * Sets the method, that will be used to run queries.
   */
  static init(func: () => Promise<unknown>): void {
    this._run = func.bind(this);
  }

  /**
   * Builds and runs the query, returning the result.
   */
  async run(): Promise<Result[]> {
    if (!Query._run) throw new Error("Cannot run without executing Query.init()");

    const query = this.build();
    return (await Query._run(query)) as Promise<Result[]>;
  }
}

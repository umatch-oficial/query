import {
  isArray,
  isPlainObject,
  isPrimitive,
  isString,
  type Dictionary,
  type OneOrArray,
  type Primitive,
} from '@umatch/utils';
import { deepClone } from '@umatch/utils/object';
import { joinNonEmpty } from '@umatch/utils/string';

import { And as AndClass, type AndCondition } from './And';
import { entryToString } from './entryToString';
import { getTableAndAlias } from './getTableAndAlias';
import { Or as OrClass, type OrCondition } from './Or';
import { RawValue } from './RawValue';
import { toArray } from './toArray';
import { toSQLValue } from './toSQLValue';
import { validateSQL } from './validateSQL';

import type { Operator } from './getOperator';
import type { DateTime } from 'luxon';
import type { Moment } from 'moment';

export type Value = Primitive | Date | DateTime | Moment | RawValue;
export type Payload = Dictionary<Value>;
export type JoinPayload = Dictionary<Primitive | OrClass>;
export { toSQLValue };

export function isValue(obj: unknown): obj is Value {
  if (obj === null) return true;
  if (isPrimitive(obj)) return true;

  return ['Date', 'DateTime', 'Moment', 'RawValue'].includes(obj?.constructor.name!);
}

/**
 * Returns an object used to represent AND conditions.
 *
 * PS: conditions are validated against SQL injection attacks. This
 * means that you cannot pass conditions including keywords like 'AND', 'OR'.
 * To pass conditions including 'OR', use [Or]{@link Or}. Alternatively,
 * you can use [Raw]{@link Raw} to pass raw SQL.
 *
 * @example
 * query.where(
 *   Or([
 *     "expiration IS NULL",
 *     And(["expiration > NOW()", "created_at > NOW() - INTERVAL '1 day'"])
 *   ])
 * )
 * @example
 * query.where(
 *   Or([
 *     "expiration IS NULL",
 *     Raw("expiration > NOW() AND created_at > NOW() - INTERVAL '1 day'")
 *   ])
 * )
 */
export function And(conditions: ReadonlyArray<AndCondition>): AndClass {
  return new AndClass(conditions);
}

/**
 * Returns an object used to represent OR conditions.
 *
 * PS: conditions are validated against SQL injection attacks. This
 * means that you cannot pass conditions including keywords like 'AND', 'OR'.
 * To pass conditions including 'AND', use [And]{@link And}. Alternatively,
 * you can use [Raw]{@link Raw} to pass raw SQL.
 *
 * @example
 * query.where(Or([
 *   "expiration IS NULL",
 *   "expiration > NOW()"
 * ]))
 */
export function Or(conditions: ReadonlyArray<OrCondition>): OrClass {
  return new OrClass(conditions);
}

/**
 * Wraps a value so that it doesn't get transformed.
 *
 * Use this method to produce raw SQL, which should not be pre-processed
 * by the query builder.
 *
 * **Warning**: this method does not validate against SQL injection attacks. Be careful to properly escape any user inputs using [Query.validate]{@link Query.validate} or another method of your choice.
 *
 * @example
 * query.where("created_at", ">", Raw("NOW() - INTERVAL '1 day'"))
 */
export function Raw(value: Primitive): RawValue {
  return new RawValue(value);
}

const propertyNamesAndInitializers = {
  with: ['_withs', () => []],
  select: ['_selects', () => []],
  from: ['_from', () => ''],
  alias: ['_alias', () => 'sub'],
  join: ['_joins', () => []],
  where: ['_wheres', () => []],
  groupBy: ['_groups', () => []],
  having: ['_havings', () => []],
  orderBy: ['_orders', () => []],
  limit: ['_limit', () => undefined],
  offset: ['_offset', () => undefined],
  trx: ['_trx', () => undefined],
} as const;
export type QueryProperty = keyof typeof propertyNamesAndInitializers;

export class Query<Result = unknown> {
  private readonly _withs: Array<string>;
  private readonly _selects: Array<string>;
  private _from: string;
  private _alias: string;
  private readonly _joins: Array<string>;
  private readonly _wheres: Array<string>;
  private readonly _groups: Array<string>;
  private readonly _havings: Array<string>;
  private readonly _orders: Array<string>;
  private _limit?: number;
  private _offset?: number;
  private _trx?: any;

  constructor() {
    this._withs = propertyNamesAndInitializers['with'][1]();
    this._selects = propertyNamesAndInitializers['select'][1]();
    this._from = propertyNamesAndInitializers['from'][1]();
    this._alias = propertyNamesAndInitializers['alias'][1]();
    this._joins = propertyNamesAndInitializers['join'][1]();
    this._wheres = propertyNamesAndInitializers['where'][1]();
    this._groups = propertyNamesAndInitializers['groupBy'][1]();
    this._havings = propertyNamesAndInitializers['having'][1]();
    this._orders = propertyNamesAndInitializers['orderBy'][1]();
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
   * Returns an object used to represent AND conditions.
   *
   * @example
   * query.where(Query.or(["expiration IS NULL", Query.and(["expiration > NOW()", "created_at > NOW() - INTERVAL '1 day'"])]))
   */
  public static and(conditions: (string | Payload | OrClass)[]): AndClass {
    return And(conditions);
  }

  /**
   * Returns an object used to represent OR conditions.
   *
   * PS: conditions are validated against SQL injection attacks. This
   * means that you cannot pass conditions including the 'AND' keyword.
   * To pass conditions including 'AND', use [Query.and]{@link Query.and}.
   * Alternatively, you can use [Query.raw]{@link Query.raw} to pass raw SQL.
   *
   * @example
   * query.where(Query.or(["expiration IS NULL", "expiration > NOW()"]))
   */
  public static or(conditions: (string | Payload | AndClass)[]): OrClass {
    return Or(conditions);
  }

  /**
   * Wraps a value so that it doesn't get transformed.
   *
   * Use this method to produce raw SQL, which should not be pre-processed
   * by the query builder.
   *
   * **Warning**: this method does not validate against SQL injection attacks. Be careful to properly escape any user inputs using [Query.validate]{@link Query.validate} or another method of your choice.
   *
   * @example
   * query.where("created_at", ">", Query.raw("NOW() - INTERVAL '1 day'"))
   */
  public static raw(value: Primitive): RawValue {
    return Raw(value);
  }

  /**
   * Validates a string against SQL vulnerability exploits.
   *
   * @throws {Error} if the string contains any potential SQL vulnerability exploits.
   */
  public static validate(value: string): string {
    return validateSQL(value);
  }

  /**
   * Adds a 'with' clause.
   */
  public with(query: string | Query, alias?: string): this {
    let _alias;
    let _query;
    if (isString(query)) {
      _alias = alias ?? propertyNamesAndInitializers['alias'][1];
      _query = query;
    } else {
      _alias = alias ?? query._alias;
      _query = query.build();
    }
    this._withs.push(`${_alias} AS (\n${_query}\n)`);
    return this;
  }

  /**
   * Adds a field to the 'select' clause.
   *
   * **Warning**: this method does not validate against SQL injection attacks. Be careful to properly escape any user inputs using [Query.validate]{@link Query.validate} or another method of your choice.
   */
  public select(field: string): this;
  /**
   * Adds fields to the 'select' clause.
   *
   * **Warning**: this method does not validate against SQL injection attacks. Be careful to properly escape any user inputs using [Query.validate]{@link Query.validate} or another method of your choice.
   */
  public select(fields: string[]): this;
  /**
   * Adds one or more fields to the 'select' clause.
   *
   * **Warning**: this method does not validate against SQL injection attacks. Be careful to properly escape any user inputs using [Query.validate]{@link Query.validate} or another method of your choice.
   */
  public select(fields: OneOrArray<string>): this {
    const _fields = toArray(fields);
    _fields.forEach((field) => this._selects.push(field));
    return this;
  }

  /**
   * Sets the 'from' table.
   *
   * @throws {Error} if the table has already been set
   */
  public from(table: string): this;
  /**
   * Sets the 'from' table.
   *
   * @throws {Error} if the table has already been set
   */
  public from(query: Query): this;
  /**
   * Sets the 'from' table.
   *
   * @throws {Error} if the table has already been set
   */
  public from(from: string | Query): this {
    if (this._from) throw new Error("Query already has 'from'");
    this._from = isString(from) ? validateSQL(from) : Query._parseSubquery(from);
    return this;
  }

  /**
   * Sets the alias that will be used in case this query becomes a subquery.
   */
  public alias(alias: string): this {
    this._alias = validateSQL(alias);
    return this;
  }

  /**
   * Sets the alias that will be used in case this query becomes a subquery.
   */
  public as(alias: string): this {
    return this.alias(alias);
  }

  /**
   * Adds a join clause.
   *
   * If 'table' is a Query, it is parsed to a subquery string.
   */
  private _join(
    joinType: 'LEFT' | 'INNER' | 'OUTER',
    table: string | Query,
    on: readonly string[] | JoinPayload,
  ): void {
    let tableAlias: string;
    let tableName: string;
    let joinTable: string;
    if (isString(table)) {
      [tableName, tableAlias] = getTableAndAlias(table);
      joinTable = tableAlias === tableName ? tableName : `${tableName} AS ${tableAlias}`;
    } else {
      tableAlias = table._alias;
      joinTable = Query._parseSubquery(table);
    }

    let ons: readonly string[];
    if (isArray(on)) {
      ons = on.map(validateSQL);
    } else {
      ons = toArray(on, entryToString(false, tableAlias));
    }

    const clause = `${joinType} JOIN ${joinTable} ON ${ons.join(' AND ')}`;
    this._joins.push(clause);
  }

  /**
   * Adds an inner join.
   *
   * Parses arrays of conditions, but does not transform values.
   */
  public innerJoin(table: string | Query, on: string[] | JoinPayload): this {
    this._join('INNER', table, on);
    return this;
  }

  /**
   * Adds a left join.
   *
   * Parses arrays of conditions, but does not transform values.
   */
  public leftJoin(table: string | Query, on: string[] | JoinPayload): this {
    this._join('LEFT', table, on);
    return this;
  }

  /**
   * Adds an outer join.
   *
   * Parses arrays of conditions, but does not transform values.
   */
  public outerJoin(table: string | Query, on: string[] | JoinPayload): this {
    this._join('OUTER', table, on);
    return this;
  }

  /**
   * Removes rows, which join on the conditions.
   */
  public excludeJoin(table: string, conditions: JoinPayload): this {
    validateSQL(table);

    const alias = `exclude_${table}`;
    // the column to exclude MUST be one of the joined columns, god knows why.
    const [excludeColumn] = Object.keys(conditions);
    this._join('LEFT', `${table} AS ${alias}`, conditions);
    this.whereRaw(`${alias}.${excludeColumn} IS NULL`);
    return this;
  }

  /**
   * Adds a join clause without parsing or transforming conditions.
   *
   * **Warning**: this method does not validate against SQL injection attacks. Be careful to properly escape any user inputs using [Query.validate]{@link Query.validate} or another method of your choice.
   */
  public joinRaw(clause: string): this;
  /**
   * Adds join clauses without parsing or transforming conditions.
   *
   * **Warning**: this method does not validate against SQL injection attacks. Be careful to properly escape any user inputs using [Query.validate]{@link Query.validate} or another method of your choice.
   */
  public joinRaw(clauses: string[]): this;
  /**
   * Adds one or more join clauses without parsing or transforming conditions.
   *
   * **Warning**: this method does not validate against SQL injection attacks. Be careful to properly escape any user inputs using [Query.validate]{@link Query.validate} or another method of your choice.
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
  public where(conditions: Payload | AndClass | OrClass): this;
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
    fieldOrConditions: string | Payload | AndClass | OrClass,
    valueOrOperator?: Value | Operator,
    value?: Value,
  ): this {
    if (value === undefined) {
      if (valueOrOperator === undefined) {
        // case 1
        if (isPlainObject(fieldOrConditions)) {
          const wheres = toArray(fieldOrConditions);
          wheres.forEach((where) => this._wheres.push(where));
          return this;
        } else if (
          fieldOrConditions instanceof AndClass ||
          fieldOrConditions instanceof OrClass
        ) {
          this._wheres.push(fieldOrConditions.toString());
          return this;
        } else {
          throw new Error('conditions must be a payload or an Or object');
        }
      } else {
        // case 2
        if (!isString(fieldOrConditions)) throw new Error('field must be a string');
        if (!isValue(valueOrOperator)) throw new Error('value must be a Primitive');
        validateSQL(fieldOrConditions);

        const condition =
          valueOrOperator === null
            ? `${fieldOrConditions} IS NULL`
            : `${fieldOrConditions} = ${toSQLValue(valueOrOperator)}`;
        this._wheres.push(condition);
        return this;
      }
    }

    // case 3
    if (!isString(fieldOrConditions)) throw new Error('field must be a string');
    if (!isString(valueOrOperator)) throw new Error('operator must be a string');
    if (!isValue(valueOrOperator)) throw new Error('value must be a Primitive');
    if (value === null) {
      throw new Error(
        'Attempted comparison with null!\nThis is often an error. If it was intended, use whereRaw instead.',
      );
    }
    validateSQL(fieldOrConditions);
    validateSQL(valueOrOperator);

    this._wheres.push(`${fieldOrConditions} ${valueOrOperator} ${toSQLValue(value)}`);
    return this;
  }

  /**
   * Adds a 'where between' condition.
   *
   * Transforms min and max using [toSQLValue()]{@link toSQLValue}.
   */
  public whereBetween(field: string, [min, max]: (number | DateTime)[]): this {
    validateSQL(field);
    this._wheres.push(`${field} BETWEEN ${toSQLValue(min)} AND ${toSQLValue(max)}`);
    return this;
  }

  /**
   * Adds 'where in' conditions.
   *
   * Iterates over entries, adding one condition per entry.
   */
  public whereIn(conditions: Dictionary<Array<Value> | RawValue>): this;
  /**
   * Adds a 'where in' condition.
   *
   * Transforms the array of values using [toSQLValue()]{@link toSQLValue}.
   */
  public whereIn(field: string, values: Array<Value> | RawValue): this;
  /**
   * Adds one or more 'where in' conditions.
   *
   * If given a dictionary, iterates over entries, adding one condition per entry.<br>
   * If given a string and an array, transforms the array of values using [toSQLValue()]{@link toSQLValue}.
   */
  public whereIn(
    fieldOrConditions: string | Dictionary<Array<Value> | RawValue>,
    values?: Array<Value> | RawValue,
  ): this {
    if (values) {
      if (!isString(fieldOrConditions)) throw new Error('field must be a string');
      validateSQL(fieldOrConditions);
      this._wheres.push(`${fieldOrConditions} IN ${toSQLValue(values)}`);
    } else {
      if (isString(fieldOrConditions)) throw new Error('Missing values');
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
  public whereNotIn(condition: Dictionary<Array<Value> | RawValue>): this;
  /**
   * Adds a 'where not in' condition.
   *
   * Transforms the array of values using [toSQLValue()]{@link toSQLValue}.
   */
  public whereNotIn(field: string, values: Array<Value> | RawValue): this;
  /**
   * Adds one or more 'where not in' conditions.
   *
   * If given a dictionary, iterates over entries, adding one condition per entry.<br>
   * If given a string and an array, transforms the array of values using [toSQLValue()]{@link toSQLValue}.
   */
  public whereNotIn(
    fieldOrConditions: string | Dictionary<Array<Value> | RawValue>,
    values?: Array<Value> | RawValue,
  ): this {
    if (values) {
      if (!isString(fieldOrConditions)) throw new Error('field must be a string');
      validateSQL(fieldOrConditions);
      this._wheres.push(`${fieldOrConditions} NOT IN ${toSQLValue(values)}`);
    } else {
      if (isString(fieldOrConditions)) throw new Error('Missing values');
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
    toArray(fields).forEach((field) =>
      this._wheres.push(`${validateSQL(field)} IS NULL`),
    );
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
    toArray(fields).forEach((field) =>
      this._wheres.push(`${validateSQL(field)} IS NOT NULL`),
    );
    return this;
  }

  /**
   * Adds a 'where' condition without transforming values.
   *
   * **Warning**: this method does not validate against SQL injection attacks. Be careful to properly escape any user inputs using [Query.validate]{@link Query.validate} or another method of your choice.
   */
  public whereRaw(predicate: string): this;
  /**
   * Adds 'where' conditions without transforming values.
   *
   * **Warning**: this method does not validate against SQL injection attacks. Be careful to properly escape any user inputs using [Query.validate]{@link Query.validate} or another method of your choice.
   */
  public whereRaw(predicates: string[]): this;
  /**
   * Adds one or more 'where' conditions without transforming values.
   *
   * **Warning**: this method does not validate against SQL injection attacks. Be careful to properly escape any user inputs using [Query.validate]{@link Query.validate} or another method of your choice.
   */
  public whereRaw(predicates: OneOrArray<string>): this {
    const wheres = toArray(predicates);
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
    toArray(fields).forEach((field) => this._groups.push(validateSQL(field)));
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
    toArray(conditions).forEach((condition) =>
      this._havings.push(validateSQL(condition)),
    );
    return this;
  }

  /**
   * Adds a column to the 'order by' clause.
   */
  public orderBy(column: string, order: 'asc' | 'desc'): this {
    validateSQL(column);
    this._orders.push(order ? `${column} ${order}` : column);
    return this;
  }

  /**
   * Adds an 'order by' expression without validating the input.
   *
   * **Warning**: this method does not validate against SQL injection attacks. Be careful to properly escape any user inputs using [Query.validate]{@link Query.validate} or another method of your choice.
   */
  public orderByRaw(expression: string): this {
    this._orders.push(expression);
    return this;
  }

  /**
   * Sets the limit.
   *
   * @throws {Error} if the limit has already been set
   */
  public limit(value: number): this {
    if (this._limit) throw new Error('Query already has limit');
    this._limit = value;
    return this;
  }

  /**
   * Sets the offset.
   *
   * @throws {Error} if the offset has already been set
   */
  public offset(value: number): this {
    if (this._offset) throw new Error('Query already has offset');
    this._offset = value;
    return this;
  }

  /**
   * Sets the transaction.
   *
   * @throws {Error} if the transaction has already been set
   */
  public trx(trx: any): this {
    if (this._trx) throw new Error('Query already has transaction');
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
   * Clears properties from the query.
   */
  public clear<T>(properties: OneOrArray<QueryProperty>): Query<T> {
    toArray(properties).forEach((prop) => {
      const [key, initializer] = propertyNamesAndInitializers[prop];
      // @ts-expect-error
      this[key] = initializer();
    });
    // @ts-expect-error override original query result
    return this;
  }

  /**
   * Returns a copy of the current query, optionally excluding some properties.
   *
   * @param {QueryProperty[]} [exclude] Properties that should not be copied
   */
  public clone<T>(exclude: QueryProperty[] = []): Query<T> {
    const newQuery = new Query();
    // @ts-expect-error
    Object.entries(this).forEach(([key, value]) => (newQuery[key] = deepClone(value)));
    // remove some properties
    return newQuery.clear<T>(exclude);
  }

  /**
   * Formats an array of predicates into a complete clause.
   *
   * @example
   * // returns ''
   * this._buildClauseString([], 'WHERE', ' AND ')
   * // returns 'WHERE a = 1'
   * this._buildClauseString(['a = 1'], 'WHERE', ' AND ')
   * // returns 'WHERE a = 1 AND b = 2'
   * this._buildClauseString(['a = 1', 'b = 2'], 'WHERE', ' AND ')
   */
  private _formatClause(
    conditions: (string | number | null | undefined)[] | undefined,
    name: string,
    separator: string = ',\n  ',
  ): string {
    const joinedConditions = joinNonEmpty(conditions, separator);
    if (!joinedConditions) return '';
    return joinNonEmpty([name, joinedConditions], ' ');
  }

  /**
   * Returns the final query.
   */
  public build(): string {
    if (!this._from) throw new Error("Cannot build query missing 'from'!");
    if (this._havings.length > 0 && this._groups.length === 0) {
      throw new Error("Cannot build query with 'having', but missing 'group by'");
    }
    if (!this._selects.length) {
      this._selects.push('*');
    }

    return joinNonEmpty(
      [
        this._formatClause(this._withs, 'WITH', ',\n'),
        this._formatClause(this._selects, 'SELECT', ',\n  '),
        this._formatClause([this._from], 'FROM'),
        ...this._joins,
        this._formatClause(this._wheres, 'WHERE', '\n  AND '),
        this._formatClause(this._groups, 'GROUP BY'),
        this._formatClause(this._havings, 'HAVING'),
        this._formatClause(this._orders, 'ORDER BY'),
        this._formatClause([this._limit], 'LIMIT'),
        this._formatClause([this._offset], 'OFFSET'),
      ],
      '\n',
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
   * @throws {Error} if the 'init' method hasn't been called
   */
  async run(): Promise<Result[]> {
    if (!this._run) throw new Error('Cannot run without executing Query.init()');

    const query = this.build();
    return (await this._run(query)) as Promise<Result[]>;
  }
}

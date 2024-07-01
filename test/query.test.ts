import { DateTime } from 'luxon';

import { And, Query, Or } from '../src';

declare module '../src' {
  interface Query<Result = unknown> {
    extraMethod: () => Result;
  }
}

/**
 Database structure for tests

 1. users
  - id
  - created_at
  - updated_at
  - name
  - deleted_at
  - tag_ids
  - expiration
  - migration
  - verified_at
 2. posts
  - id
  - created_at
  - updated_at
  - closed_at
  - content
  - downvotes
  - upvotes
  - user_id
 3. comments
  - id
  - created_at
  - updated_at
  - content
  - downvotes
  - upvotes
  - user_id
  - comment_id
  - post_id
 */

describe('Query class', () => {
  test('is extendable', () => {
    Query.prototype.extraMethod = () => 'extra';
    expect(new Query().extraMethod()).toBe('extra');
  });
  test('can be cloned', () => {
    const query = new Query().from('users').select('id');
    const cloned = query.clone();
    expect(query === cloned).toBeFalsy();
    cloned.select('name');
    // @ts-expect-error
    expect(query._selects).toEqual(['id']);
    // @ts-expect-error
    expect(cloned._selects).toEqual(['id', 'name']);
  });
  test('can be initialized', async () => {
    let queryString;
    Query.init({ run: async (query: Query) => (queryString = query.build()) });
    await new Query().from('users').run();
    expect('\n' + queryString).toBe(
      `
SELECT *
FROM users`,
    );
  });
  test("throws an error if it hasn't been initialized", async () => {
    // @ts-expect-error
    Query.init({});
    await expect(() => new Query().from('users').run()).rejects.toThrow('Cannot run');
  });
  test("throws an error if there is no 'from' clause", () => {
    expect(() => new Query().build()).toThrow('Cannot build');
  });
  test("throws an error if there is a 'having' clause, but no 'group by' clause", () => {
    expect(() => {
      new Query().having('').build();
    }).toThrow('Cannot build');
  });
});

describe('Or class', () => {
  test('works with Payloads and strings', () => {
    const orString = Or([`content = ''`, { content: null, user_id: null }]).toString();
    expect(orString).toBe(`(content = '' OR (content IS NULL AND user_id IS NULL))`);
  });
  test('works in where clauses', () => {
    const queryString = new Query()
      .from('users')
      .where(Or(['deleted_at IS NULL', 'deleted_at > NOW()']))
      .build();
    expect('\n' + queryString).toBe(`
SELECT *
FROM users
WHERE (deleted_at IS NULL OR deleted_at > NOW())`);
  });
  test('works in join clauses', () => {
    const queryString = new Query()
      .from('users')
      .leftJoin('posts', {
        user_id: 'users.id',
        closed_at: Or(['IS NULL', '> NOW()']),
      })
      .build();
    expect('\n' + queryString).toBe(`
SELECT *
FROM users
LEFT JOIN posts AS p ON p.user_id = users.id AND (p.closed_at IS NULL OR p.closed_at > NOW())`);
  });
});

describe('And class', () => {
  test('works inside Or', () => {
    const orString = Or([
      `content = ''`,
      And(['content IS NULL', 'user_id IS NULL']),
    ]).toString();
    expect(orString).toBe(`(content = '' OR (content IS NULL AND user_id IS NULL))`);
  });
});

describe('query.from()', () => {
  test('works with string', () => {
    const queryString = new Query().from('users').build();
    expect('\n' + queryString).toBe(
      `
SELECT *
FROM users`,
    );
  });
  test('works with string and alias', () => {
    const queryString = new Query().from('users', 'u2').build();
    expect('\n' + queryString).toBe(
      `
SELECT *
FROM users AS u2`,
    );
  });
  test('overrides alias', () => {
    const queryString = new Query().from('users u', 'u2').build();
    expect('\n' + queryString).toBe(
      `
SELECT *
FROM users AS u2`,
    );
  });
  test('works with Query', () => {
    const subQuery = new Query()
      .select('CASE WHEN upvotes > downvotes THEN 1 ELSE 0 END as has_positive_karma')
      .from('posts');
    const queryString = new Query()
      .select('sum(has_positive_karma)/count(*) as positive_karma_ratio')
      .from(subQuery)
      .build();
    expect('\n' + queryString).toBe(
      `
SELECT sum(has_positive_karma)/count(*) as positive_karma_ratio
FROM (
SELECT CASE WHEN upvotes > downvotes THEN 1 ELSE 0 END as has_positive_karma
FROM posts
) AS sub`,
    );
  });
  test('works with Query and alias', () => {
    const subQuery = new Query()
      .select('CASE WHEN upvotes > downvotes THEN 1 ELSE 0 END as has_positive_karma')
      .from('posts');
    const queryString = new Query()
      .select('sum(has_positive_karma)/count(*) as positive_karma_ratio')
      .from(subQuery, 'q')
      .build();
    expect('\n' + queryString).toBe(
      `
SELECT sum(has_positive_karma)/count(*) as positive_karma_ratio
FROM (
SELECT CASE WHEN upvotes > downvotes THEN 1 ELSE 0 END as has_positive_karma
FROM posts
) AS q`,
    );
  });
});

describe('alias methods', () => {
  const expectedQueryString = `
SELECT *
FROM (
SELECT *
FROM users
) AS q`;

  test('query.as()', () => {
    const subQuery = new Query().from('users').as('q');
    const queryString = new Query().from(subQuery).build();
    expect('\n' + queryString).toBe(expectedQueryString);
  });
  test('query.alias()', () => {
    const subQuery = new Query().from('users').alias('q');
    const queryString = new Query().from(subQuery).build();
    expect('\n' + queryString).toBe(expectedQueryString);
  });
  test('Query.getAlias()', () => {
    const getAlias = Query.getAlias;
    expect(Query.getAlias('translations_tags')).toBe('tt');
    Query.init({
      getAlias: (table: string) =>
        table
          .split('_')
          .map((word) => word.slice(0, 2))
          .join(''),
      run: async () => {},
    });

    expect(Query.getAlias('translations_tags')).toBe('trta');
    Query.init({
      getAlias,
      run: async () => {},
    });
  });
});

describe('query.select()', () => {
  test('works with single field', () => {
    const queryString = new Query().from('comments').select('content').build();
    expect('\n' + queryString).toBe(`
SELECT content
FROM comments`);
  });
  test('works with array of fields', () => {
    const queryString = new Query().from('comments').select(['content', 'id']).build();
    expect('\n' + queryString).toBe(`
SELECT content,
  id
FROM comments`);
  });
});

describe('join methods', () => {
  const query = new Query().select(['users.id', 'count(posts.*)']).from('users');
  const expectedQueryString = (type: string) => `
SELECT users.id,
  count(posts.*)
FROM users
${type} JOIN posts AS p ON p.user_id = users.id`;

  describe('query.innerJoin()', () => {
    test('works with array of conditions', () => {
      const queryString = query
        .clone()
        .innerJoin('posts as p', ['p.user_id = users.id'])
        .build();
      expect('\n' + queryString).toBe(expectedQueryString('INNER'));
    });
    test('works with Payload', () => {
      const queryString = query
        .clone()
        .innerJoin('posts as p', { user_id: 'users.id' })
        .build();
      expect('\n' + queryString).toBe(expectedQueryString('INNER'));
    });
  });

  describe('query.leftJoin()', () => {
    test('works with array of conditions', () => {
      const queryString = query
        .clone()
        .leftJoin('posts as p', ['p.user_id = users.id'])
        .build();
      expect('\n' + queryString).toBe(expectedQueryString('LEFT'));
    });
    test('works with Payload', () => {
      const queryString = query
        .clone()
        .leftJoin('posts as p', { user_id: 'users.id' })
        .build();
      expect('\n' + queryString).toBe(expectedQueryString('LEFT'));
    });
  });

  describe('query.outerJoin()', () => {
    test('works with array of conditions', () => {
      const queryString = query
        .clone()
        .outerJoin('posts as p', ['p.user_id = users.id'])
        .build();
      expect('\n' + queryString).toBe(expectedQueryString('OUTER'));
    });
    test('works with Payload', () => {
      const queryString = query
        .clone()
        .outerJoin('posts as p', { user_id: 'users.id' })
        .build();
      expect('\n' + queryString).toBe(expectedQueryString('OUTER'));
    });
  });

  describe('query.excludeJoin()', () => {
    test('works with Payload', () => {
      const queryString = new Query()
        .from('users')
        .excludeJoin('posts', { user_id: 'users.id' })
        .build();
      expect('\n' + queryString).toBe(`
SELECT *
FROM users
LEFT JOIN posts AS exclude_posts ON exclude_posts.user_id = users.id
WHERE exclude_posts.user_id IS NULL`);
    });
  });

  describe('query.joinRaw()', () => {
    test('works with single clause', () => {
      const queryString = query
        .clone()
        .joinRaw('LEFT JOIN posts AS p ON p.user_id = users.id')
        .build();
      expect('\n' + queryString).toBe(expectedQueryString('LEFT'));
    });
    test('works with array of clauses', () => {
      const queryString = query
        .clone()
        .joinRaw(['LEFT JOIN posts AS p ON p.user_id = users.id'])
        .build();
      expect('\n' + queryString).toBe(expectedQueryString('LEFT'));
    });
  });
});

describe('where methods', () => {
  describe('query.where()', () => {
    test('works with Payload', () => {
      const queryString = new Query()
        .from('comments')
        .where({ post_id: 1, user_id: 1 })
        .build();
      expect('\n' + queryString).toBe(`
SELECT *
FROM comments
WHERE post_id = 1
  AND user_id = 1`);
    });
    test('works with field and value', () => {
      const queryString = new Query().from('comments').where('content', 'Hello').build();
      expect('\n' + queryString).toBe(
        `
SELECT *
FROM comments
WHERE content = 'Hello'`,
      );
    });
    test('works with field, value and operator', () => {
      const queryString = new Query().from('comments').where('upvotes', '>', 100).build();
      expect('\n' + queryString).toBe(
        `
SELECT *
FROM comments
WHERE upvotes > 100`,
      );
    });
  });

  describe('query.whereAfter()', () => {
    test('default false', () => {
      const queryString = new Query()
        .from('users')
        .whereAfter('verified_at', Query.raw('NOW()'))
        .build();
      expect('\n' + queryString).toBe(
        `
SELECT *
FROM users
WHERE COALESCE(verified_at, '-infinity'::TIMESTAMP) > NOW()`,
      );
    });
    test('default true', () => {
      const queryString = new Query()
        .from('users')
        .whereAfter('expiration', Query.raw('NOW()'), true)
        .build();
      expect('\n' + queryString).toBe(
        `
SELECT *
FROM users
WHERE COALESCE(expiration, '+infinity'::TIMESTAMP) > NOW()`,
      );
    });
  });

  describe('query.whereBefore()', () => {
    test('default false', () => {
      const queryString = new Query()
        .from('users')
        .whereBefore('verified_at', Query.raw('NOW()'))
        .build();
      expect('\n' + queryString).toBe(
        `
SELECT *
FROM users
WHERE COALESCE(verified_at, '+infinity'::TIMESTAMP) < NOW()`,
      );
    });
    test('default true', () => {
      const queryString = new Query()
        .from('users')
        .whereBefore('migration', Query.raw('NOW()'), true)
        .build();
      expect('\n' + queryString).toBe(
        `
SELECT *
FROM users
WHERE COALESCE(migration, '-infinity'::TIMESTAMP) < NOW()`,
      );
    });
  });

  describe('query.whereBetween()', () => {
    test('works with numbers', () => {
      const queryString = new Query()
        .from('comments')
        .whereBetween('upvotes', [0, 10])
        .build();
      expect('\n' + queryString).toBe(
        `
SELECT *
FROM comments
WHERE upvotes BETWEEN 0 AND 10`,
      );
    });
    test('works with datetimes', () => {
      const min = DateTime.fromISO('2023-01-01T00:00:00.000+00:00', { setZone: true });
      const max = DateTime.fromISO('2024-01-01T00:00:00.000+00:00', { setZone: true });
      const queryString = new Query()
        .from('posts')
        .whereBetween('created_at', [min, max])
        .build();
      expect('\n' + queryString).toBe(
        `
SELECT *
FROM posts
WHERE created_at BETWEEN '2023-01-01T00:00:00.000Z' AND '2024-01-01T00:00:00.000Z'`,
      );
    });
  });

  describe('query.whereContains()', () => {
    test('works with field and values', () => {
      const queryString = new Query()
        .from('users')
        .whereContains('tag_ids', [1, 2, 3])
        .build();
      expect('\n' + queryString).toBe(
        `
SELECT *
FROM users
WHERE tag_ids @> ARRAY[1, 2, 3]`,
      );
    });
  });

  describe('query.whereContainedIn()', () => {
    test('works with field and values', () => {
      const queryString = new Query()
        .from('users')
        .whereContainedIn('tag_ids', [1, 2, 3])
        .build();
      expect('\n' + queryString).toBe(
        `
SELECT *
FROM users
WHERE tag_ids <@ ARRAY[1, 2, 3]`,
      );
    });
  });

  describe('query.whereIn()', () => {
    test('works with field and values', () => {
      const queryString = new Query().from('users').whereIn('id', [1, 2]).build();
      expect('\n' + queryString).toBe(
        `
SELECT *
FROM users
WHERE id IN (1, 2)`,
      );
    });
    test('works with field and subquery', () => {
      const subquery = new Query()
        .from('posts')
        .select('user_id')
        .where('downvotes', '>', 10);
      const queryString = new Query().from('users').whereIn('id', subquery).build();
      expect('\n' + queryString).toBe(
        `
SELECT *
FROM users
WHERE id IN (
SELECT user_id
FROM posts
WHERE downvotes > 10
)`,
      );
    });
  });

  describe('query.whereNotIn()', () => {
    test('works with field and values', () => {
      const queryString = new Query().from('users').whereNotIn('id', [1, 2]).build();
      expect('\n' + queryString).toBe(
        `
SELECT *
FROM users
WHERE id NOT IN (1, 2)`,
      );
    });
    test('works with field and subquery', () => {
      const subquery = new Query()
        .from('posts')
        .select('user_id')
        .where('downvotes', '>', 10);
      const queryString = new Query().from('users').whereNotIn('id', subquery).build();
      expect('\n' + queryString).toBe(
        `
SELECT *
FROM users
WHERE id NOT IN (
SELECT user_id
FROM posts
WHERE downvotes > 10
)`,
      );
    });
  });

  describe('query.whereNull()', () => {
    test('works with single field', () => {
      const queryString = new Query().from('posts').whereNull('content').build();
      expect('\n' + queryString).toBe(
        `
SELECT *
FROM posts
WHERE content IS NULL`,
      );
    });
    test('works with array of fields', () => {
      const queryString = new Query()
        .from('posts')
        .whereNull(['created_at', 'updated_at'])
        .build();
      expect('\n' + queryString).toBe(`
SELECT *
FROM posts
WHERE created_at IS NULL
  AND updated_at IS NULL`);
    });
  });

  describe('query.whereNotNull()', () => {
    test('works with single field', () => {
      const queryString = new Query().from('posts').whereNotNull('content').build();
      expect('\n' + queryString).toBe(
        `
SELECT *
FROM posts
WHERE content IS NOT NULL`,
      );
    });
    test('works with array of fields', () => {
      const queryString = new Query()
        .from('posts')
        .whereNotNull(['created_at', 'updated_at'])
        .build();
      expect('\n' + queryString).toBe(
        `
SELECT *
FROM posts
WHERE created_at IS NOT NULL
  AND updated_at IS NOT NULL`,
      );
    });
  });

  describe('query.whereRaw()', () => {
    test('works with single clause', () => {
      const queryString = new Query()
        .from('posts')
        .whereRaw("created_at > NOW() - INTERVAL '1 day'")
        .build();
      expect('\n' + queryString).toBe(`
SELECT *
FROM posts
WHERE created_at > NOW() - INTERVAL '1 day'`);
    });
    test('works with array of clauses', () => {
      const queryString = new Query()
        .from('posts')
        .whereRaw([
          "created_at > NOW() - INTERVAL '1 day'",
          "updated_at > NOW() - INTERVAL '1 day'",
        ])
        .build();
      expect('\n' + queryString).toBe(
        `
SELECT *
FROM posts
WHERE created_at > NOW() - INTERVAL '1 day'
  AND updated_at > NOW() - INTERVAL '1 day'`,
      );
    });
  });
});

describe('query.with()', () => {
  test('works with string', () => {
    const queryString = new Query().with('SELECT *\nFROM users').from('sub').build();
    expect('\n' + queryString).toBe(`
WITH sub AS (
SELECT *
FROM users
)
SELECT *
FROM sub`);
  });
  test('works with subquery', () => {
    const subquery = new Query().from('users');
    const queryString = new Query().with(subquery).from('sub').build();
    expect('\n' + queryString).toBe(`
WITH sub AS (
SELECT *
FROM users
)
SELECT *
FROM sub`);
  });
  test('accepts an alias', () => {
    const subquery = new Query().from('users');
    const queryString = new Query().with(subquery, 'q').from('q').build();
    expect('\n' + queryString).toBe(`
WITH q AS (
SELECT *
FROM users
)
SELECT *
FROM q`);
  });
});

describe('query.groupBy()', () => {
  test('works with single field', () => {
    const queryString = new Query()
      .select(['post_id', 'count(*)'])
      .from('comments')
      .groupBy('post_id')
      .build();
    expect('\n' + queryString).toBe(`
SELECT post_id,
  count(*)
FROM comments
GROUP BY post_id`);
  });
  test('works with array of fields', () => {
    const queryString = new Query()
      .select(['post_id', 'user_id', 'count(*)'])
      .from('comments')
      .groupBy(['post_id', 'user_id'])
      .build();
    expect('\n' + queryString).toBe(
      `
SELECT post_id,
  user_id,
  count(*)
FROM comments
GROUP BY post_id,
  user_id`,
    );
  });
});

describe('query.having()', () => {
  test('works with single condition', () => {
    const queryString = new Query()
      .select(['post_id', 'count(*)'])
      .from('comments')
      .groupBy('post_id')
      .having('count(*) >= 10')
      .build();
    expect('\n' + queryString).toBe(
      `
SELECT post_id,
  count(*)
FROM comments
GROUP BY post_id
HAVING count(*) >= 10`,
    );
  });
  test('works with array of conditions', () => {
    const queryString = new Query()
      .select(['post_id', 'count(*)'])
      .from('comments')
      .groupBy('post_id')
      .having(['count(*) >= 10', 'count(*) < 20'])
      .build();
    expect('\n' + queryString).toBe(
      `
SELECT post_id,
  count(*)
FROM comments
GROUP BY post_id
HAVING count(*) >= 10,
  count(*) < 20`,
    );
  });
});

describe('order by methods', () => {
  describe('query.orderBy()', () => {
    test("works with 'asc'", () => {
      const queryString = new Query().from('users').orderBy('created_at', 'asc').build();
      expect('\n' + queryString).toBe(
        `
SELECT *
FROM users
ORDER BY created_at asc`,
      );
    });
    test("works with 'desc'", () => {
      const queryString = new Query().from('users').orderBy('created_at', 'desc').build();
      expect('\n' + queryString).toBe(
        `
SELECT *
FROM users
ORDER BY created_at desc`,
      );
    });
  });
  test('query.orderByRaw()', () => {
    const queryString = new Query().from('users').orderByRaw('RANDOM()').build();
    expect('\n' + queryString).toBe(`
SELECT *
FROM users
ORDER BY RANDOM()`);
  });
});

describe('query.forPage()', () => {
  test('works with single page', () => {
    const queryString = new Query().from('users').forPage(1, 10).build();
    expect('\n' + queryString).toBe(`
SELECT *
FROM users
LIMIT 10`);
  });
  test('works with multiple pages', () => {
    const queryString = new Query().from('users').forPage(2, 10).build();
    expect('\n' + queryString).toBe(`
SELECT *
FROM users
LIMIT 10
OFFSET 10`);
  });
});

describe('null value handling', () => {
  describe('in join clauses', () => {
    describe('in join methods', () => {
      test('works with Payload', () => {
        const queryString = new Query()
          .from('users')
          .leftJoin('posts', { user_id: 'users.id', content: null })
          .build();
        expect('\n' + queryString).toBe(`
SELECT *
FROM users
LEFT JOIN posts AS p ON p.user_id = users.id AND p.content IS NULL`);
      });
    });
  });
  describe('in where clauses', () => {
    const expectedQueryString = `
SELECT *
FROM posts
WHERE content IS NULL`;

    describe('in where methods', () => {
      test('works with field and value', () => {
        const queryString = new Query().from('posts').where('content', null).build();
        expect('\n' + queryString).toBe(expectedQueryString);
      });
      test('works with Payload', () => {
        const queryString = new Query().from('posts').where({ content: null }).build();
        expect('\n' + queryString).toBe(expectedQueryString);
      });
      test('throws an error if there is an operator and the value is null', () => {
        expect(() => {
          new Query().from('posts').where('content', '=', null);
        }).toThrow('comparison with null');
      });
    });
  });
});

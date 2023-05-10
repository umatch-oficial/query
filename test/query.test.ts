import { Query } from "../src";

declare module "../src" {
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
 2. posts
  - id
  - created_at
  - updated_at
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

describe("Query class", () => {
  test("is extendable", () => {
    Query.prototype.extraMethod = () => "extra";
    expect(new Query().extraMethod()).toBe("extra");
  });

  test("can be cloned", () => {
    const query = new Query({ from: "users", select: ["id"] });
    const cloned = query.clone();
    expect(query === cloned).toBeFalsy();
    cloned.select("name");
    // @ts-expect-error
    expect(query._selects).toEqual(["id"]);
    // @ts-expect-error
    expect(cloned._selects).toEqual(["id", "name"]);
  });

  test("can initialized", async () => {
    let queryString;
    Query.init(async (query: string) => (queryString = query));
    await new Query({ from: "users" }).run();
    expect("\n" + queryString).toBe(
      `
SELECT *
FROM users`,
    );
  });

  test("throws an error if it hasn't been initialized", async () => {
    // @ts-expect-error
    Query.init(undefined);
    await expect(() => new Query({ from: "users" }).run()).rejects.toThrow("Cannot run");
  });

  test("throws an error if there is no 'from' clause", () => {
    expect(() => new Query().build()).toThrow("Cannot build");
  });

  test("throws an error if there is a 'having' clause, but no 'group by' clause", () => {
    expect(() => {
      new Query({ having: "" }).build();
    }).toThrow("Cannot build");
  });
});

describe("query.from()", () => {
  test("works with table", () => {
    const queryString = new Query().from("users").build();
    expect("\n" + queryString).toBe(
      `
SELECT *
FROM users`,
    );
  });
  test("works with Query", () => {
    const subQuery = new Query({
      select: "CASE WHEN upvotes > downvotes THEN 1 ELSE 0 END as has_positive_karma",
      from: "posts",
    });
    const queryString = new Query({
      select: "sum(has_positive_karma)/count(*) as positive_karma_ratio",
    })
      .from(subQuery)
      .build();
    expect("\n" + queryString).toBe(
      `
SELECT sum(has_positive_karma)/count(*) as positive_karma_ratio
FROM (
SELECT CASE WHEN upvotes > downvotes THEN 1 ELSE 0 END as has_positive_karma
FROM posts
) AS sub`,
    );
  });
});

describe("alias methods", () => {
  const expectedQueryString = `
SELECT *
FROM (
SELECT *
FROM users
) AS q`;

  test("query.as()", () => {
    const subQuery = new Query({ from: "users" }).as("q");
    const queryString = new Query({ from: subQuery }).build();
    expect("\n" + queryString).toBe(expectedQueryString);
  });
  test("query.alias()", () => {
    const subQuery = new Query({ from: "users" }).alias("q");
    const queryString = new Query({ from: subQuery }).build();
    expect("\n" + queryString).toBe(expectedQueryString);
  });
});

describe("query.select()", () => {
  test("works with single field", () => {
    const queryString = new Query({ from: "comments" }).select("content").build();
    expect("\n" + queryString).toBe(`
SELECT content
FROM comments`);
  });
  test("works with array of fields", () => {
    const queryString = new Query({ from: "comments" }).select(["content", "id"]).build();
    expect("\n" + queryString).toBe(`
SELECT content,
  id
FROM comments`);
  });
});

describe("join methods", () => {
  const query = new Query({
    select: ["users.id", "count(posts.*)"],
    from: "users",
  });
  const expectedQueryString = (type: string) => `
SELECT users.id,
  count(posts.*)
FROM users
${type} JOIN posts AS p ON p.user_id = users.id`;

  describe("query.innerJoin()", () => {
    test("works with array of conditions", () => {
      const queryString = query
        .clone()
        .innerJoin("posts as p", ["p.user_id = users.id"])
        .build();
      expect("\n" + queryString).toBe(expectedQueryString("INNER"));
    });
    test("works with Payload", () => {
      const queryString = query
        .clone()
        .innerJoin("posts as p", { user_id: "users.id" })
        .build();
      expect("\n" + queryString).toBe(expectedQueryString("INNER"));
    });
  });

  describe("query.leftJoin()", () => {
    test("works with array of conditions", () => {
      const queryString = query
        .clone()
        .leftJoin("posts as p", ["p.user_id = users.id"])
        .build();
      expect("\n" + queryString).toBe(expectedQueryString("LEFT"));
    });
    test("works with Payload", () => {
      const queryString = query
        .clone()
        .leftJoin("posts as p", { user_id: "users.id" })
        .build();
      expect("\n" + queryString).toBe(expectedQueryString("LEFT"));
    });
  });

  describe("query.outerJoin()", () => {
    test("works with array of conditions", () => {
      const queryString = query
        .clone()
        .outerJoin("posts as p", ["p.user_id = users.id"])
        .build();
      expect("\n" + queryString).toBe(expectedQueryString("OUTER"));
    });
    test("works with Payload", () => {
      const queryString = query
        .clone()
        .outerJoin("posts as p", { user_id: "users.id" })
        .build();
      expect("\n" + queryString).toBe(expectedQueryString("OUTER"));
    });
  });

  test("query.excludeJoin()", () => {
    const queryString = new Query({ from: "users" })
      .excludeJoin("posts", { user_id: "users.id" })
      .build();
    expect("\n" + queryString).toBe(`
SELECT *
FROM users
LEFT JOIN posts AS exclude_posts ON exclude_posts.user_id = users.id
WHERE exclude_posts.user_id IS NULL`);
  });

  describe("query.joinRaw()", () => {
    test("works with single clause", () => {
      const queryString = query
        .clone()
        .joinRaw("LEFT JOIN posts AS p ON p.user_id = users.id")
        .build();
      expect("\n" + queryString).toBe(expectedQueryString("LEFT"));
    });
    test("works with array of clauses", () => {
      const queryString = query
        .clone()
        .joinRaw(["LEFT JOIN posts AS p ON p.user_id = users.id"])
        .build();
      expect("\n" + queryString).toBe(expectedQueryString("LEFT"));
    });
  });
});

describe("query.where()", () => {
  test("works with Payload", () => {
    const queryString = new Query({ from: "comments" })
      .where({ post_id: 1, user_id: 1 })
      .build();
    expect("\n" + queryString).toBe(`
SELECT *
FROM comments
WHERE post_id = 1
  AND user_id = 1`);
  });
  test("works with field and value", () => {
    const queryString = new Query({ from: "comments" }).where("content", "Hello").build();
    expect("\n" + queryString).toBe(
      `
SELECT *
FROM comments
WHERE content = 'Hello'`,
    );
  });
  test("works with field, value and operator", () => {
    const queryString = new Query({ from: "comments" })
      .where("upvotes", ">", 100)
      .build();
    expect("\n" + queryString).toBe(
      `
SELECT *
FROM comments
WHERE upvotes > 100`,
    );
  });
});

test("query.whereBetween()", () => {
  const queryString = new Query({ from: "comments" })
    .whereBetween("upvotes", [0, 10])
    .build();
  expect("\n" + queryString).toBe(
    `
SELECT *
FROM comments
WHERE upvotes BETWEEN 0 AND 10`,
  );
});

describe("query.whereIn()", () => {
  test("works with Payload", () => {
    const queryString = new Query({ from: "users" })
      .whereIn({ name: ["Alice", "Bob"] })
      .build();
    expect("\n" + queryString).toBe(
      `
SELECT *
FROM users
WHERE name IN ('Alice', 'Bob')`,
    );
  });
  test("works with field and values", () => {
    const queryString = new Query({ from: "users" }).whereIn("id", [1, 2]).build();
    expect("\n" + queryString).toBe(
      `
SELECT *
FROM users
WHERE id IN (1, 2)`,
    );
  });
});

describe("query.whereNotIn()", () => {
  test("works with Payload", () => {
    const queryString = new Query({ from: "users" })
      .whereNotIn({ name: ["Alice", "Bob"] })
      .build();
    expect("\n" + queryString).toBe(`
SELECT *
FROM users
WHERE name NOT IN ('Alice', 'Bob')`);
  });
  test("works with field and values", () => {
    const queryString = new Query({ from: "users" }).whereNotIn("id", [1, 2]).build();
    expect("\n" + queryString).toBe(
      `
SELECT *
FROM users
WHERE id NOT IN (1, 2)`,
    );
  });
});

describe("query.whereNull()", () => {
  test("works with single field", () => {
    const queryString = new Query({ from: "posts" }).whereNull("content").build();
    expect("\n" + queryString).toBe(
      `
SELECT *
FROM posts
WHERE content IS NULL`,
    );
  });
  test("works with array of fields", () => {
    const queryString = new Query({ from: "posts" })
      .whereNull(["created_at", "updated_at"])
      .build();
    expect("\n" + queryString).toBe(`
SELECT *
FROM posts
WHERE created_at IS NULL
  AND updated_at IS NULL`);
  });
});

describe("query.whereNotNull()", () => {
  test("works with single field", () => {
    const queryString = new Query({ from: "posts" }).whereNotNull("content").build();
    expect("\n" + queryString).toBe(
      `
SELECT *
FROM posts
WHERE content IS NOT NULL`,
    );
  });
  test("works with array of fields", () => {
    const queryString = new Query({ from: "posts" })
      .whereNotNull(["created_at", "updated_at"])
      .build();
    expect("\n" + queryString).toBe(
      `
SELECT *
FROM posts
WHERE created_at IS NOT NULL
  AND updated_at IS NOT NULL`,
    );
  });
});

describe("query.whereRaw()", () => {
  test("works with single clause", () => {
    const queryString = new Query({ from: "posts" })
      .whereRaw("created_at > NOW() - INTERVAL '1 day'")
      .build();
    expect("\n" + queryString).toBe(`
SELECT *
FROM posts
WHERE created_at > NOW() - INTERVAL '1 day'`);
  });
  test("works with array of clauses", () => {
    const queryString = new Query({ from: "posts" })
      .whereRaw([
        "created_at > NOW() - INTERVAL '1 day'",
        "updated_at > NOW() - INTERVAL '1 day'",
      ])
      .build();
    expect("\n" + queryString).toBe(
      `
SELECT *
FROM posts
WHERE created_at > NOW() - INTERVAL '1 day'
  AND updated_at > NOW() - INTERVAL '1 day'`,
    );
  });
});

describe("query.groupBy()", () => {
  test("works with single field", () => {
    const queryString = new Query({ select: ["post_id", "count(*)"], from: "comments" })
      .groupBy("post_id")
      .build();
    expect("\n" + queryString).toBe(`
SELECT post_id,
  count(*)
FROM comments
GROUP BY post_id`);
  });
  test("works with array of fields", () => {
    const queryString = new Query({
      select: ["post_id", "user_id", "count(*)"],
      from: "comments",
    })
      .groupBy(["post_id", "user_id"])
      .build();
    expect("\n" + queryString).toBe(
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

describe("query.having()", () => {
  test("works with single condition", () => {
    const queryString = new Query({
      select: ["post_id", "count(*)"],
      from: "comments",
      groupBy: "post_id",
    })
      .having("count(*) >= 10")
      .build();
    expect("\n" + queryString).toBe(
      `
SELECT post_id,
  count(*)
FROM comments
GROUP BY post_id
HAVING count(*) >= 10`,
    );
  });
  test("works with array of conditions", () => {
    const queryString = new Query({
      select: ["post_id", "count(*)"],
      from: "comments",
      groupBy: "post_id",
    })
      .having(["count(*) >= 10", "count(*) < 20"])
      .build();
    expect("\n" + queryString).toBe(
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

test("query.orderBy()", () => {
  const queryString = new Query({ from: "users" }).orderBy("created_at", "desc").build();
  expect("\n" + queryString).toBe(
    `
SELECT *
FROM users
ORDER BY created_at desc`,
  );
});

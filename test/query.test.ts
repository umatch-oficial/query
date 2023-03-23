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

  test("throws an error if there is no 'from' clause", () => {
    expect(() => new Query().build()).toThrow("Cannot build");
  });

  test("throws an error if there is a 'having' clause, but no 'group by' clause", () => {
    expect(() => {
      new Query({ having: "" }).build();
    }).toThrow("Cannot build");
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

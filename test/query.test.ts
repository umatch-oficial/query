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
});

describe("query.where()", () => {
  test("works with Payload", () => {
    expect(
      new Query({ from: "comments" }).where({ post_id: 1, user_id: 1 }).build(),
    ).toBe("SELECT *\nFROM comments\nWHERE post_id = 1\n  AND user_id = 1");
  });
  test("works with field and value", () => {
    expect(new Query({ from: "comments" }).where("content", "Hello").build()).toBe(
      "SELECT *\nFROM comments\nWHERE content = 'Hello'",
    );
  });
  test("works with field, value and operator", () => {
    expect(new Query({ from: "comments" }).where("upvotes", ">", 100).build()).toBe(
      "SELECT *\nFROM comments\nWHERE upvotes > 100",
    );
  });
});

test("query.whereBetween()", () => {
  expect(new Query({ from: "comments" }).whereBetween("upvotes", [0, 10]).build()).toBe(
    "SELECT *\nFROM comments\nWHERE upvotes BETWEEN 0 AND 10",
  );
});

describe("query.whereIn()", () => {
  test("works with Payload", () => {
    expect(new Query({ from: "users" }).whereIn({ name: ["Alice", "Bob"] }).build()).toBe(
      "SELECT *\nFROM users\nWHERE name IN ('Alice', 'Bob')",
    );
  });
  test("works with field and values", () => {
    expect(new Query({ from: "users" }).whereIn("id", [1, 2]).build()).toBe(
      "SELECT *\nFROM users\nWHERE id IN (1, 2)",
    );
  });
});

describe("query.whereNotIn()", () => {
  test("works with Payload", () => {
    expect(
      new Query({ from: "users" }).whereNotIn({ name: ["Alice", "Bob"] }).build(),
    ).toBe("SELECT *\nFROM users\nWHERE name NOT IN ('Alice', 'Bob')");
  });
  test("works with field and values", () => {
    expect(new Query({ from: "users" }).whereNotIn("id", [1, 2]).build()).toBe(
      "SELECT *\nFROM users\nWHERE id NOT IN (1, 2)",
    );
  });
});

describe("query.whereNull()", () => {
  test("works with single field", () => {
    expect(new Query({ from: "posts" }).whereNull("content").build()).toBe(
      "SELECT *\nFROM posts\nWHERE content IS NULL",
    );
  });
  test("works with array of fields", () => {
    expect(
      new Query({ from: "posts" }).whereNull(["created_at", "updated_at"]).build(),
    ).toBe("SELECT *\nFROM posts\nWHERE created_at IS NULL\n  AND updated_at IS NULL");
  });
});

describe("query.whereNotNull()", () => {
  test("works with single field", () => {
    expect(new Query({ from: "posts" }).whereNotNull("content").build()).toBe(
      "SELECT *\nFROM posts\nWHERE content IS NOT NULL",
    );
  });
  test("works with array of fields", () => {
    expect(
      new Query({ from: "posts" }).whereNotNull(["created_at", "updated_at"]).build(),
    ).toBe(
      "SELECT *\nFROM posts\nWHERE created_at IS NOT NULL\n  AND updated_at IS NOT NULL",
    );
  });
});

describe("query.whereRaw()", () => {
  test("works with single clause", () => {
    expect(
      new Query({ from: "posts" })
        .whereRaw("created_at > NOW() - INTERVAL '1 day'")
        .build(),
    ).toBe("SELECT *\nFROM posts\nWHERE created_at > NOW() - INTERVAL '1 day'");
  });
  test("works with array of clauses", () => {
    expect(
      new Query({ from: "posts" })
        .whereRaw([
          "created_at > NOW() - INTERVAL '1 day'",
          "updated_at > NOW() - INTERVAL '1 day'",
        ])
        .build(),
    ).toBe(
      "SELECT *\nFROM posts\nWHERE created_at > NOW() - INTERVAL '1 day'\n  AND updated_at > NOW() - INTERVAL '1 day'",
    );
  });
});

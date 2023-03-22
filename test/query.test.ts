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

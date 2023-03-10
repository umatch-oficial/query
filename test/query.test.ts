import { Query } from "../src";

declare module "../src" {
  interface Query<Result = unknown> {
    extraMethod: () => string;
  }
}
Query.prototype.extraMethod = () => "extra";

test("empty", () => {
  new Query();
});

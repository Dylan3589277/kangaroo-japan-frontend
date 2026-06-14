import assert from "node:assert/strict";
import test from "node:test";

import { getNumericH5UserId } from "./identity";

function params(query: string) {
  return new URLSearchParams(query);
}

test("H5 user identity accepts user_id and uid aliases only when numeric", () => {
  assert.equal(getNumericH5UserId(params("user_id=42")), "42");
  assert.equal(getNumericH5UserId(params("uid=43")), "43");
  assert.equal(getNumericH5UserId(params("user_id=42&uid=43")), "42");
  assert.equal(getNumericH5UserId(params("user_id=%20007%20")), "007");
  assert.equal(getNumericH5UserId(params("user_id=openid-abc")), undefined);
  assert.equal(getNumericH5UserId(params("uid=user-code-123")), undefined);
  assert.equal(getNumericH5UserId(params("")), undefined);
});

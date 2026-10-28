import assert from "node:assert/strict";
import test from "node:test";
import { safeNextPath } from "../lib/auth/redirect.mjs";
import { matchesInviteEmail } from "../lib/invites/email.mjs";

test("safeNextPath preserves an internal invite route and its query", () => {
  assert.equal(
    safeNextPath("/invite/token-123?source=email#join", "https://jns.test"),
    "/invite/token-123?source=email#join",
  );
});

test("safeNextPath rejects external and malformed destinations", () => {
  for (const path of [
    null,
    "",
    "https://attacker.example",
    "//attacker.example/path",
    "/\\\\attacker.example/path",
  ]) {
    assert.equal(safeNextPath(path, "https://jns.test"), null, String(path));
  }
});

test("invite email matching ignores surrounding whitespace and case", () => {
  assert.equal(
    matchesInviteEmail(" Person@Example.com ", "person@example.com"),
    true,
  );
});

test("invite email matching rejects different or missing addresses", () => {
  assert.equal(
    matchesInviteEmail("owner@example.com", "stranger@example.com"),
    false,
  );
  assert.equal(matchesInviteEmail("", "stranger@example.com"), false);
  assert.equal(matchesInviteEmail(null, "owner@example.com"), false);
});

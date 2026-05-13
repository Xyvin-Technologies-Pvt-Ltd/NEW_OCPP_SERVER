const { computeMobileWsToken, verifyMobileWsHandshake } = require("../src/utils/mobileWsAuth");

test("sanity", () => {
  expect(true).toBe(true);
});

test("mobile ws hmac verifies", () => {
  const secret = "abcdefghijklmnop"; // ≥16 chars
  const cid = "tx-abc";
  const token = computeMobileWsToken(cid, secret);
  expect(verifyMobileWsHandshake(cid, token, secret)).toBe(true);
  expect(verifyMobileWsHandshake(cid, "wrong", secret)).toBe(false);
});

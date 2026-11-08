import { beforeAll, describe, expect, it } from "vitest";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const testSecret = "vitest_only_secret_key_with_more_than_32_chars";
let createAccessToken: (user: { id: number; username: string }) => string;
let createRefreshToken: (user: { id: number; username: string }) => string;

beforeAll(async () => {
  process.env.JWT_SECRET = testSecret;
  const tokenUtils = await import("../src/utils/tokens.ts");
  createAccessToken = tokenUtils.createAccessToken;
  createRefreshToken = tokenUtils.createRefreshToken;
});

describe("Authentication utilities", () => {
  it("hashes passwords and verifies the original password", async () => {
    const password = "test-password-123";
    const hash = await bcrypt.hash(password, 4);

    expect(hash).not.toBe(password);
    expect(await bcrypt.compare(password, hash)).toBe(true);
    expect(await bcrypt.compare("wrong-password", hash)).toBe(false);
  });

  it("creates a signed access token with the user's subject", () => {
    const token = createAccessToken({ id: 42, username: "test_user" });
    const decoded = jwt.verify(token, testSecret) as jwt.JwtPayload;

    expect(decoded.sub).toBe("42");
    expect(decoded.username).toBe("test_user");
    expect(decoded.exp).toBeTypeOf("number");
    expect(decoded.tokenType).toBeUndefined();
  });

  it("creates a signed refresh token marked as refresh and with an expiry", () => {
    const token = createRefreshToken({ id: 7, username: "refresh_user" });
    const decoded = jwt.verify(token, testSecret) as jwt.JwtPayload;

    expect(decoded.sub).toBe("7");
    expect(decoded.tokenType).toBe("refresh");
    expect(decoded.exp).toBeTypeOf("number");
  });
});

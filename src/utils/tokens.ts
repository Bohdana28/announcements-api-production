
import jwt, { type JwtPayload, type Secret } from "jsonwebtoken";

const secretValue = process.env.JWT_SECRET;

if (!secretValue || secretValue.length < 32) {
  throw new Error(
    "JWT_SECRET must be set and contain at least 32 characters.",
  );
}

const secret: Secret = secretValue;

export function createAccessToken(user: {
  id: number;
  username: string;
}): string {
  return jwt.sign(
    { username: user.username },
    secret,
    {
      subject: String(user.id),
      expiresIn: "15m",
    },
  );
}

export function createRefreshToken(user: {
  id: number;
  username: string;
}): string {
  return jwt.sign(
    { username: user.username, tokenType: "refresh" },
    secret,
    {
      subject: String(user.id),
      expiresIn: "7d",
    },
  );
}

export function verifyRefreshToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, secret);

  if (
    typeof decoded === "string" ||
    decoded.tokenType !== "refresh" ||
    !decoded.sub
  ) {
    throw new Error("Invalid refresh token");
  }

  return decoded;
}

export function verifyAccessToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, secret);

  if (
    typeof decoded === "string" ||
    decoded.tokenType === "refresh" ||
    !decoded.sub
  ) {
    throw new Error("Invalid access token");
  }

  return decoded;
}

import crypto from "crypto";

export function deriveKeyFromPassword(
  password: string,
  salt: Buffer,
  keyLength: number
): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, keyLength, "sha256");
}

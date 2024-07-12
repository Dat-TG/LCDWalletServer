import crypto from "crypto";
import { ec as EC } from "elliptic";

export function deriveKeyFromPassword(
  password: string,
  salt: Buffer,
  keyLength: number
): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, keyLength, "sha256");
}

export function getPublicKeyFromPrivateKey(privateKey: string): string {
  // Create a new elliptic curve key pair from the private key
  const ec = new EC("secp256k1");
  const keyPair = ec.keyFromPrivate(privateKey);

  // Get the public key in hexadecimal format
  const publicKey = keyPair.getPublic("hex");

  return publicKey;
}

import { SHA256 } from "crypto-js";
class Block {
  index: number;
  hash: string;
  previousHash: string;
  timestamp: number;
  data: string;
  difficulty: number;
  nonce: number;
  constructor({
    index,
    hash,
    previousHash,
    timestamp,
    data,
    difficulty,
    nonce,
  }: {
    index: number;
    hash: string;
    previousHash: string;
    timestamp: number;
    data: string;
    difficulty: number;
    nonce: number;
  }) {
    this.index = index;
    this.hash = hash;
    this.previousHash = previousHash;
    this.timestamp = timestamp;
    this.data = data;
    this.difficulty = difficulty;
    this.nonce = nonce;
  }
  calculateHash(): string {
    return SHA256(
      this.index +
        this.previousHash +
        this.timestamp +
        this.data +
        this.difficulty +
        this.nonce
    ).toString();
  }
}

export default Block;

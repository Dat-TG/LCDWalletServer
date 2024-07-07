import { SHA256 } from "crypto-js";
import Transaction from "../transaction/Transaction";

class Block {
  index: number;
  hash: string;
  previousHash: string;
  timestamp: number;
  transactions: Transaction[];
  validator: string;
  signature: string;

  constructor({
    index,
    previousHash,
    timestamp,
    transactions,
    validator,
    signature,
  }: {
    index: number;
    previousHash: string;
    timestamp: number;
    transactions: Transaction[];
    validator: string;
    signature: string;
  }) {
    this.index = index;
    this.previousHash = previousHash;
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.validator = validator;
    this.signature = signature;
    this.hash = this.calculateHash();
  }

  calculateHash(): string {
    return SHA256(
      this.index +
        this.previousHash +
        this.timestamp +
        JSON.stringify(this.transactions) +
        this.validator
    ).toString();
  }
}

export default Block;

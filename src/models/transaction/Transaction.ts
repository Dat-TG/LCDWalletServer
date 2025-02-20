import { SHA256 } from "crypto-js";
import TxIn from "./TxIn";
import TxOut from "./TxOut";
import { ec as EC } from "elliptic";

const ec = new EC("secp256k1");
import crypto from "crypto";

class Transaction {
  id: string;
  timestamp: number;
  txIns: TxIn[];
  txOuts: TxOut[];

  constructor({ txIns, txOuts }: { txIns: TxIn[]; txOuts: TxOut[] }) {
    this.txIns = txIns;
    this.txOuts = txOuts;
    this.id = this.generateId();
    this.timestamp = Date.now();
  }

  private generateId(): string {
    const txInsData = this.txIns
      ?.map((txIn) => `${txIn.txOutId}-${txIn.txOutIndex}`)
      .join("-");
    const txOutsData = this.txOuts
      ?.map((txOut) => `${txOut.address}-${txOut.amount}`)
      .join("-");
    const data = `${txInsData}-${txOutsData}-${new Date().getTime()}`;
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  calculateHash(): string {
    return SHA256(
      this.txIns.map((txIn) => txIn.txOutId + txIn.txOutIndex).join("") +
        this.txOuts.map((txOut) => txOut.address + txOut.amount).join("")
    ).toString();
  }

  signTransaction(privateKey: string): void {
    const key = ec.keyFromPrivate(privateKey);
    const signature = key.sign(this.calculateHash(), "base64");
    const signature_hex = signature.toDER("hex");
    this.txIns.forEach((txIn) => {
      txIn.signature = signature_hex;
    });
  }

  static validateStructure(transaction: Transaction): boolean {
    if (typeof transaction.id !== "string") {
      console.error("Invalid id type in Transaction");
      return false;
    }
    if (
      !Array.isArray(transaction.txIns) ||
      !transaction.txIns.every(TxIn.validateStructure)
    ) {
      console.error("Invalid txIns structure in Transaction");
      return false;
    }
    if (
      !Array.isArray(transaction.txOuts) ||
      !transaction.txOuts.every(TxOut.validateStructure)
    ) {
      console.error("Invalid txOuts structure in Transaction");
      return false;
    }
    return true;
  }
}

export default Transaction;

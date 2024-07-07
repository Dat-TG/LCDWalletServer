import { SHA256 } from "crypto-js";
import TxIn from "./TxIn";
import TxOut from "./TxOut";
import { ec as EC } from "elliptic";

const ec = new EC("secp256k1");
import crypto from "crypto";

class Transaction {
  id: string;
  txIns: TxIn[];
  txOuts: TxOut[];

  constructor({ txIns, txOuts }: { txIns: TxIn[]; txOuts: TxOut[] }) {
    this.id = this.generateId();
    this.txIns = txIns;
    this.txOuts = txOuts;
  }

  private generateId(): string {
    const data = JSON.stringify(this);
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
    this.txIns[0].signature = signature.toDER("hex");
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

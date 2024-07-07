class TxIn {
  txOutId: string;
  txOutIndex: number;
  signature: string;

  constructor({
    txOutId,
    txOutIndex,
    signature,
  }: {
    txOutId: string;
    txOutIndex: number;
    signature: string;
  }) {
    this.txOutId = txOutId;
    this.txOutIndex = txOutIndex;
    this.signature = signature;
  }

  static validateStructure(txIn: TxIn): boolean {
    if (typeof txIn.txOutId !== "string") {
      console.error("Invalid txOutId type in TxIn");
      return false;
    }
    if (typeof txIn.txOutIndex !== "number") {
      console.error("Invalid txOutIndex type in TxIn");
      return false;
    }
    if (typeof txIn.signature !== "string") {
      console.error("Invalid signature type in TxIn");
      return false;
    }
    return true;
  }
}

export default TxIn;

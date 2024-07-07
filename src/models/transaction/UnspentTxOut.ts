class UnspentTxOut {
  txOutId: string;
  txOutIndex: number;
  address: string;
  amount: number;

  constructor(
    txOutId: string,
    txOutIndex: number,
    address: string,
    amount: number
  ) {
    this.txOutId = txOutId;
    this.txOutIndex = txOutIndex;
    this.address = address;
    this.amount = amount;
  }

  static validateStructure(unspentTxOut: UnspentTxOut): boolean {
    if (typeof unspentTxOut.txOutId !== "string") {
      console.error("Invalid txOutId type in UnspentTxOut");
      return false;
    }
    if (typeof unspentTxOut.txOutIndex !== "number") {
      console.error("Invalid txOutIndex type in UnspentTxOut");
      return false;
    }
    if (typeof unspentTxOut.address !== "string") {
      console.error("Invalid address type in UnspentTxOut");
      return false;
    }
    if (typeof unspentTxOut.amount !== "number") {
      console.error("Invalid amount type in UnspentTxOut");
      return false;
    }
    return true;
  }
}

export default UnspentTxOut;

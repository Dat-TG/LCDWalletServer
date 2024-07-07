class TxOut {
  address: string;
  amount: number;

  constructor(address: string, amount: number) {
    this.address = address;
    this.amount = amount;
  }

  static validateStructure(txOut: TxOut): boolean {
    if (typeof txOut.address !== "string") {
      console.error("Invalid address type in TxOut");
      return false;
    }
    if (typeof txOut.amount !== "number") {
      console.error("Invalid amount type in TxOut");
      return false;
    }
    return true;
  }
}

export default TxOut;

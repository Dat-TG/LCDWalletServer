import Transaction from "./Transaction";

class TransactionPool {
  transactions: Transaction[];

  constructor() {
    this.transactions = [];
  }

  addTransaction(transaction: Transaction) {
    if (Transaction.validateStructure(transaction)) {
      this.transactions.push(transaction);
    } else {
      throw new Error("Invalid transaction structure");
    }
  }

  removeTransaction(transactionId: string) {
    this.transactions = this.transactions.filter(
      (tx) => tx.id !== transactionId
    );
  }

  findTransaction(transactionId: string): Transaction | undefined {
    return this.transactions.find((tx) => tx.id === transactionId);
  }

  validatePool(): boolean {
    return this.transactions.every(Transaction.validateStructure);
  }
}

export default TransactionPool;

import Transaction from "../transaction/Transaction";
import TransactionPool from "../transaction/TransactionPool";
import TxIn from "../transaction/TxIn";
import TxOut from "../transaction/TxOut";
import UnspentTxOut from "../transaction/UnspentTxOut";
import Block from "./block";

class Blockchain {
  chain: Block[];
  transactionPool: TransactionPool;
  unspentTxOuts: UnspentTxOut[];
  validators: Map<string, number>; // Map of public key to stake

  constructor() {
    this.chain = [this.createGenesisBlock()];
    this.transactionPool = new TransactionPool();
    this.unspentTxOuts = [];
    this.validators = new Map<string, number>();
  }

  createGenesisBlock(): Block {
    return new Block({
      index: 0,
      previousHash: "0",
      timestamp: Date.now(),
      transactions: [],
      validator: "genesis-validator", // This can be a predefined value or an address
      signature: "genesis-signature", // This can be a predefined value
    });
  }

  getLatestBlock(): Block {
    return this.chain[this.chain.length - 1];
  }

  addBlock(newBlock: Block): boolean {
    newBlock.previousHash = this.getLatestBlock().hash;
    newBlock.hash = newBlock.calculateHash();

    if (this.isValidNewBlock(newBlock, this.getLatestBlock())) {
      this.chain.push(newBlock);
      this.updateUnspentTxOuts(newBlock);
      return true;
    }
    return false;
  }

  isValidNewBlock(newBlock: Block, previousBlock: Block): boolean {
    if (previousBlock.index + 1 !== newBlock.index) {
      console.error("Invalid index");
      return false;
    }
    if (previousBlock.hash !== newBlock.previousHash) {
      console.error("Invalid previousHash");
      return false;
    }
    if (newBlock.hash !== newBlock.calculateHash()) {
      console.error("Invalid hash");
      return false;
    }
    // Further validation for PoS specific attributes can be added here.
    return true;
  }

  isChainValid(): boolean {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      if (!this.isValidNewBlock(currentBlock, previousBlock)) {
        return false;
      }
    }
    return true;
  }

  updateUnspentTxOuts(block: Block): void {
    const newUnspentTxOuts: UnspentTxOut[] = [];
    const consumedTxOuts: { txOutId: string; txOutIndex: number }[] = [];

    block.transactions.forEach((tx: Transaction) => {
      tx.txOuts.forEach((txOut: TxOut, index: number) => {
        newUnspentTxOuts.push(
          new UnspentTxOut(tx.id, index, txOut.address, txOut.amount)
        );
      });
      tx.txIns.forEach((txIn: TxIn) => {
        consumedTxOuts.push({
          txOutId: txIn.txOutId,
          txOutIndex: txIn.txOutIndex,
        });
      });
    });

    this.unspentTxOuts = this.unspentTxOuts
      .filter(
        (uTxO: UnspentTxOut) =>
          !consumedTxOuts.find(
            (cTxO) =>
              cTxO.txOutId === uTxO.txOutId &&
              cTxO.txOutIndex === uTxO.txOutIndex
          )
      )
      .concat(newUnspentTxOuts);
  }

  getBalance(address: string): number {
    return this.unspentTxOuts
      .filter((uTxO) => uTxO.address === address)
      .reduce((sum, uTxO) => sum + uTxO.amount, 0);
  }

  getTransactionById(transactionId: string): Transaction | null {
    for (const block of this.chain) {
      const transaction = block.transactions.find(
        (tx) => tx.id === transactionId
      );
      if (transaction) {
        return transaction;
      }
    }
    return null;
  }

  addTransaction(transaction: Transaction): boolean {
    if (
      Transaction.validateStructure(transaction) &&
      this.isValidTransaction(transaction)
    ) {
      this.transactionPool.addTransaction(transaction);
      return true;
    }
    return false;
  }

  isValidTransaction(transaction: Transaction): boolean {
    // 1. Check if transaction is already in the blockchain (prevents double-spending)
    for (const block of this.chain) {
      if (block.transactions.some((tx) => tx.id === transaction.id)) {
        return false;
      }
    }

    // 2. Check if input transactions exist and are unspent in the UTXO set
    for (const txIn of transaction.txIns) {
      if (
        !this.unspentTxOuts.some(
          (uTxO) =>
            uTxO.txOutId === txIn.txOutId && uTxO.txOutIndex === txIn.txOutIndex
        )
      ) {
        return false;
      }
    }

    // 3. Verify transaction signature for each input
    if (!transaction.txIns.every((txIn) => txIn.signature)) {
      return false;
    }

    // 4. Check if total input amount is greater than or equal to total output amount
    const totalInput = transaction.txIns.reduce(
      (acc, txIn) =>
        acc +
        (this.unspentTxOuts.find(
          (uTxO) =>
            uTxO.txOutId === txIn.txOutId && uTxO.txOutIndex === txIn.txOutIndex
        )?.amount || 0),
      0
    );

    const totalOutput = transaction.txOuts.reduce(
      (acc, txOut) => acc + txOut.amount,
      0
    );

    if (totalInput < totalOutput) {
      return false;
    }

    // 5. Additional checks (e.g., no duplicate outputs, minimum output amount)
    // ... (Add your specific blockchain rules here)

    return true;
  }

  registerValidator(publicKey: string, stake: number): void {
    this.validators.set(publicKey, stake);
  }

  selectValidator(): string {
    const totalStake = Array.from(this.validators.values()).reduce(
      (acc, stake) => acc + stake,
      0
    );

    const random = Math.random() * totalStake;
    let cumulativeStake = 0;

    for (const [publicKey, stake] of this.validators.entries()) {
      cumulativeStake += stake;
      if (random < cumulativeStake) {
        return publicKey;
      }
    }

    throw new Error("No validators found");
  }

  mineBlock(): Block {
    const validator = this.selectValidator();
    const newBlock = new Block({
      index: this.chain.length,
      previousHash: this.getLatestBlock().hash,
      timestamp: Date.now(),
      transactions: this.transactionPool.transactions,
      validator: validator,
      signature: "", // Add logic to create a signature
    });

    newBlock.hash = newBlock.calculateHash();
    if (this.addBlock(newBlock)) {
      this.transactionPool.transactions = []; // Clear transaction pool after mining a block
      return newBlock;
    } else {
      throw new Error("Failed to add block to the chain");
    }
  }

  getTransactionPool(): Transaction[] {
    return this.transactionPool.transactions;
  }

  getTransactionHistory(address: string): Transaction[] {
    const transactions: Transaction[] = [];

    for (const block of this.chain) {
      for (const transaction of block.transactions) {
        if (
          transaction.txOuts.some((txOut) => txOut.address === address) ||
          transaction.txIns.some((txIn) => {
            const referencedTxOut = this.unspentTxOuts.find(
              (uTxO) =>
                uTxO.txOutId === txIn.txOutId &&
                uTxO.txOutIndex === txIn.txOutIndex
            );
            return referencedTxOut?.address === address;
          })
        ) {
          transactions.push(transaction);
        }
      }
    }

    return transactions;
  }
}

export default Blockchain;

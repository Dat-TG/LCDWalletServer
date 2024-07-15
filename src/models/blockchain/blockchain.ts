import { rewardAmount } from "../../constants";
import { TransactionDetails } from "../../types/transactionDetails";
import { getPublicKeyFromPrivateKey } from "../../utils/helper";
import {
  broadcastBalanceUpdate,
  broadcastMiningStats,
  broadcastNewBlock,
  broadcastTransactionHistory,
  broadcastTransactionPool,
} from "../../websocket";
import Transaction from "../transaction/Transaction";
import TransactionPool from "../transaction/TransactionPool";
import TxIn from "../transaction/TxIn";
import TxOut from "../transaction/TxOut";
import UnspentTxOut from "../transaction/UnspentTxOut";
import Block from "./block";
import { ec as EC } from "elliptic";
const ec = new EC("secp256k1");

class Blockchain {
  chain: Block[];
  transactionPool: TransactionPool;
  unspentTxOuts: UnspentTxOut[];
  allTxOuts: UnspentTxOut[];
  validators: Map<string, number>; // Map of private key to stake

  constructor() {
    this.chain = [this.createGenesisBlock()];
    this.transactionPool = new TransactionPool();
    this.unspentTxOuts = this.createGenesisUnspentTxOuts();
    this.allTxOuts = this.createGenesisUnspentTxOuts();
    this.validators = new Map<string, number>([]);
  }

  createGenesisUnspentTxOuts(): UnspentTxOut[] {
    const genesisBlock = this.chain[0];
    const unspentTxOuts: UnspentTxOut[] = [];
    for (const tx of genesisBlock.transactions) {
      for (let i = 0; i < tx.txOuts.length; i++) {
        unspentTxOuts.push(
          new UnspentTxOut(tx.id, i, tx.txOuts[i].address, tx.txOuts[i].amount)
        );
      }
    }
    return unspentTxOuts;
  }

  createGenesisBlock(): Block {
    const initialTxOut = new TxOut({
      address:
        "04ddf6c141bdeae4244494ceb4fc3076c77e57df0f28fe96ab9c030b7af78f8e860ea6850e5305dfa02cf7d57283988e696fc1bc1ea3c930245598935c5d030019", // Replace with the address of your initial wallet
      amount: 1000, // Assign an initial amount
    });

    const genesisTransaction = new Transaction({
      txIns: [],
      txOuts: [initialTxOut],
    });

    return new Block({
      index: 0,
      previousHash: "0",
      timestamp: Date.now(),
      transactions: [genesisTransaction],
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
    console.error("Invalid block");
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

  isNewChainValid(chain: Block[]): boolean {
    if (
      JSON.stringify(chain[0]) !== JSON.stringify(this.createGenesisBlock())
    ) {
      return false;
    }

    for (let i = 1; i < chain.length; i++) {
      if (!this.isValidNewBlock(chain[i], chain[i - 1])) {
        return false;
      }
    }
    return true;
  }

  getUnspentTxOutsFromChain(chain: Block[]): UnspentTxOut[] {
    let unspentTxOuts: UnspentTxOut[] = [];

    chain.forEach((block) => {
      block.transactions.forEach((tx) => {
        tx.txOuts.forEach((txOut, index) => {
          unspentTxOuts.push(
            new UnspentTxOut(tx.id, index, txOut.address, txOut.amount)
          );
        });

        tx.txIns.forEach((txIn) => {
          unspentTxOuts = unspentTxOuts.filter(
            (uTxO) =>
              !(
                uTxO.txOutId === txIn.txOutId &&
                uTxO.txOutIndex === txIn.txOutIndex
              )
          );
        });
      });
    });

    return unspentTxOuts;
  }

  getUnspentTxOuts(address: string): UnspentTxOut[] {
    return this.unspentTxOuts.filter((uTxO) => uTxO.address === address);
  }

  replaceChain(newChain: Block[]): void {
    if (newChain.length <= this.chain.length) {
      console.error("Received chain is not longer than the current chain.");
      return;
    }

    if (!this.isNewChainValid(newChain)) {
      console.error("Received chain is invalid.");
      return;
    }

    console.log("Replacing current chain with new chain.");
    this.chain = newChain;
    // Optionally, update unspent transactions
    this.unspentTxOuts = this.getUnspentTxOutsFromChain(newChain);
  }

  // Update UTXOs based on new transactions
  private updateUnspentTxOuts(block: Block): void {
    const newUnspentTxOuts: UnspentTxOut[] = [];
    const consumedTxOuts: { txOutId: string; txOutIndex: number }[] = [];

    block.transactions.forEach((transaction) => {
      transaction.txOuts.forEach((txOut: TxOut, index: number) => {
        newUnspentTxOuts.push(
          new UnspentTxOut(transaction.id, index, txOut.address, txOut.amount)
        );
      });

      transaction.txIns.forEach((txIn: TxIn) => {
        consumedTxOuts.push({
          txOutId: txIn.txOutId,
          txOutIndex: txIn.txOutIndex,
        });
      });
    });

    this.allTxOuts = this.allTxOuts.concat(newUnspentTxOuts);

    const updatedUnspentTxOuts = this.unspentTxOuts
      .filter(
        (uTxO: UnspentTxOut) =>
          !consumedTxOuts.find(
            (cTxO) =>
              cTxO.txOutId === uTxO.txOutId &&
              cTxO.txOutIndex === uTxO.txOutIndex
          )
      )
      .concat(newUnspentTxOuts);

    this.unspentTxOuts = updatedUnspentTxOuts;
    console.log("Unspent transaction outputs after update", this.unspentTxOuts);
  }

  getBalance(address: string): number {
    console.log("Getting balance of address", address);
    console.log(
      "Unspent transaction outputs before calculation",
      this.unspentTxOuts
    );
    const balance = this.unspentTxOuts
      .filter((uTxO) => uTxO.address === address)
      .reduce((sum, uTxO) => sum + uTxO.amount, 0);
    console.log("Balance of address", address, "is", balance);
    return balance;
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
      const unique_address_list = [
        ...new Set(transaction.txOuts.map((txOut) => txOut.address)),
      ];
      unique_address_list.forEach((address) => {
        broadcastTransactionHistory(
          address,
          this.getTransactionHistory(address)
        );
      });
      broadcastTransactionPool(this.getTransactionPool());
      return true;
    }
    console.error("Invalid transaction");
    return false;
  }

  isValidTransaction(transaction: Transaction): boolean {
    // 1. Check if transaction is already in the blockchain (prevents double-spending)
    for (const block of this.chain) {
      if (block.transactions.some((tx) => tx.id === transaction.id)) {
        console.error(
          "Transaction is already in the blockchain",
          transaction.id
        );
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
        console.error("Transaction input is invalid or already spent");
        return false;
      }
    }

    // 3. Verify transaction signature for each input
    if (!transaction.txIns.every((txIn) => txIn.signature)) {
      console.error("Transaction signature is missing");
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
      console.error("Total input amount is less than total output amount");
      return false;
    }

    // 5. Additional checks (e.g., no duplicate outputs, minimum output amount)
    // ... (Add your specific blockchain rules here)

    console.log("Transaction is valid");

    return true;
  }

  registerValidator(privateKey: string, stake: number): void {
    this.validators.set(privateKey, stake);
  }

  isValidatorRegistered(privateKey: string): number {
    // Return the stake of the validator if it exists else return 0
    return this.validators.get(privateKey) || 0;
  }

  selectValidator(): string {
    const totalStake = Array.from(this.validators.values()).reduce(
      (acc, stake) => acc + stake,
      0
    );

    const random = Math.random() * totalStake;
    let cumulativeStake = 0;

    for (const [validator, stake] of this.validators.entries()) {
      cumulativeStake += stake;
      if (random < cumulativeStake) {
        return validator;
      }
    }

    throw new Error("No validators found");
  }

  // Function to create a reward transaction for the validator
  createRewardTransaction(
    validator: string,
    amount = rewardAmount
  ): Transaction {
    console.log(
      "Creating reward transaction for validator",
      getPublicKeyFromPrivateKey(validator)
    );
    const rewardTransaction = new Transaction({
      txIns: [],
      txOuts: [
        {
          address: getPublicKeyFromPrivateKey(validator),
          amount: amount,
        },
      ],
    });
    return rewardTransaction;
  }

  // Function to sign a block
  signBlock(block: Block, privateKey: string): string {
    const dataToSign = block.calculateHash(); // Example data to sign
    const key = ec.keyFromPrivate(privateKey);
    const signature = key.sign(dataToSign, "base64");
    return signature.toDER("hex");
  }

  mineBlock() {
    const validator = this.selectValidator();
    const rewardTransaction = this.createRewardTransaction(validator);
    const transactions = [
      ...this.transactionPool.transactions,
      rewardTransaction,
    ];
    const validatorAddress = getPublicKeyFromPrivateKey(validator);
    const newBlock = new Block({
      index: this.chain.length,
      previousHash: this.getLatestBlock().hash,
      timestamp: Date.now(),
      transactions: transactions,
      validator: validatorAddress,
      signature: "", // Add logic to create a signature
    });

    newBlock.hash = newBlock.calculateHash();
    newBlock.signature = this.signBlock(newBlock, validator); // Sign the block
    // Simulate delay in mining
    console.log("Block mined:", newBlock);
    setTimeout(() => {
      if (this.addBlock(newBlock)) {
        this.transactionPool.transactions = []; // Clear transaction pool after mining a block
        broadcastNewBlock(newBlock);
        broadcastTransactionPool(this.getTransactionPool());
        // broadcast balance update for address in transactions array
        const unique_address_list = [
          ...new Set(
            transactions.flatMap((tx) =>
              tx.txOuts.map((txOut) => txOut.address)
            )
          ),
        ];
        unique_address_list.forEach((address) => {
          broadcastBalanceUpdate(address, this.getBalance(address));
          broadcastTransactionHistory(
            address,
            this.getTransactionHistory(address)
          );
        });
        broadcastMiningStats(
          validatorAddress,
          this.getMiningStatistics(validatorAddress)
        );
      } else {
        throw new Error("Failed to add block to the chain");
      }
    }, 5000);
  }

  getTransactionPool(): TransactionDetails[] {
    const transactionDetails: TransactionDetails[] = [];
    for (const transaction of this.transactionPool.transactions) {
      transaction.txOuts.forEach((txOut) => {
        const fromAddress = this.findSenderAddress(transaction.txIns);
        transactionDetails.push({
          status: "pending",
          id: transaction.id,
          fromAddress: fromAddress || "LCD Wallet",
          toAddress: txOut.address,
          amount: txOut.amount,
          timestamp: transaction.timestamp,
        });
      });
    }
    const filteredTransactionDetails = transactionDetails.filter(
      (transaction) => {
        return transaction.fromAddress !== transaction.toAddress;
      }
    );
    return filteredTransactionDetails;
  }

  // Helper function to find the sender address of a transaction
  private findSenderAddress(txIns: TxIn[]): string | undefined {
    console.log("Finding sender address for transaction inputs:", txIns);
    for (const txIn of txIns) {
      console.log("Checking UTXOs for txIn:", txIn);
      const referencedTxOut = this.allTxOuts.find(
        (uTxO) =>
          uTxO.txOutId === txIn.txOutId && uTxO.txOutIndex === txIn.txOutIndex
      );
      if (referencedTxOut) {
        console.log("Found referenced UTXO:", referencedTxOut);
        return referencedTxOut.address;
      }
    }
    console.log("No referenced UTXO found for txIns:", txIns);
    return undefined;
  }

  // Function to get transaction history
  getTransactionHistory(address: string): TransactionDetails[] {
    const transactionDetails: TransactionDetails[] = [];

    // Helper function to check if a transaction involves the given address
    const isAddressInTransaction = (transaction: Transaction): boolean => {
      return (
        transaction.txOuts.some((txOut) => txOut.address === address) ||
        transaction.txIns.some((txIn) => {
          const referencedTxOut = this.unspentTxOuts.find(
            (uTxO) =>
              uTxO.txOutId === txIn.txOutId &&
              uTxO.txOutIndex === txIn.txOutIndex
          );
          return referencedTxOut?.address === address;
        })
      );
    };

    // Extract transaction details
    const extractTransactionDetails = (
      transaction: Transaction,
      status: string
    ) => {
      const fromAddress = this.findSenderAddress(transaction.txIns);
      console.log("From address:", fromAddress);
      transaction.txOuts.forEach((txOut) => {
        if (txOut.address === address) {
          transactionDetails.push({
            status,
            id: transaction.id,
            fromAddress: fromAddress || "LCD Wallet",
            toAddress: txOut.address,
            amount: txOut.amount,
            timestamp: transaction.timestamp,
          });
        } else if (fromAddress === address) {
          transactionDetails.push({
            status,
            id: transaction.id,
            fromAddress: fromAddress || "LCD Wallet",
            toAddress: txOut.address,
            amount: txOut.amount,
            timestamp: transaction.timestamp,
          });
        }
      });
    };

    // Check the blockchain for confirmed transactions
    for (const block of this.chain) {
      for (const transaction of block.transactions) {
        if (isAddressInTransaction(transaction)) {
          extractTransactionDetails(transaction, "confirmed");
        }
      }
    }

    // Check the transaction pool for pending transactions
    for (const transaction of this.transactionPool.transactions) {
      if (isAddressInTransaction(transaction)) {
        extractTransactionDetails(transaction, "pending");
      }
    }

    // Filter out transactions where the address is the change address
    const filteredTransactionDetails = transactionDetails.filter(
      (transaction) => {
        return transaction.fromAddress !== transaction.toAddress;
      }
    );

    // Sort transactions by timestamp in descending order
    filteredTransactionDetails.sort((a, b) => b.timestamp - a.timestamp);

    return filteredTransactionDetails;
  }

  getMiningStatistics(validatorAddress: string) {
    const minedBlocks = this.chain.filter(
      (block) => block.validator === validatorAddress
    );
    const rewards = minedBlocks.length * rewardAmount;
    return {
      minedBlocks: minedBlocks.length,
      rewards: rewards,
    };
  }
}

export default Blockchain;

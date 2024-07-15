import { Request, Response } from "express"; // Assuming you're using Express.js
import Block from "../models/blockchain/block";
import TransactionPool from "../models/transaction/TransactionPool";
import blockchain from "../instances/blockchainInstance";
import { getPublicKeyFromPrivateKey } from "../utils/helper";
import TxIn from "../models/transaction/TxIn";
import TxOut from "../models/transaction/TxOut";
import Transaction from "../models/transaction/Transaction";
import {
  broadcastBalanceUpdate,
  broadcastNewBlock,
  broadcastTransactionHistory,
} from "../websocket";

const transactionPool = new TransactionPool();

// Controller for getting the latest 5 blocks
export const getLatestBlocks = (req: Request, res: Response) => {
  /*
      #swagger.auto = false
      #swagger.tags = ['Blocks']
      #swagger.path = '/blocks/latest'
      #swagger.method = 'get'
      #swagger.summary = 'Get the latest 5 blocks'
      #swagger.description = 'Returns the latest 5 blocks from the blockchain.'
      #swagger.responses[200] = {
        description: 'An array of the latest blocks.',
        schema: { type: 'array', items: { $ref: '#/definitions/Block' } }
      }
*/
  try {
    // Get the latest 5 blocks sorted by index in descending order
    const latestBlocks = blockchain.chain
      .slice(-5)
      .sort((a, b) => b.index - a.index);
    res.json(latestBlocks);
  } catch (error) {
    if (error instanceof Error) {
      // Type guard to check for Error object
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "An unknown error occurred." });
    }
  }
};

// Controller for getting all blocks
export const getAllBlocks = (req: Request, res: Response) => {
  /*
      #swagger.auto = false
      #swagger.tags = ['Blocks']
      #swagger.path = '/blocks/all'
      #swagger.method = 'get'
      #swagger.summary = 'Get All Blocks'
      #swagger.description = 'Retrieves all blocks in the blockchain, starting from the genesis block.'
      #swagger.responses[200] = {
        description: 'An array containing all blocks in the blockchain.',
        schema: { type: 'array', items: { $ref: '#/definitions/Block' } }
      }
      #swagger.responses[500] = {
        description: 'Internal Server Error. An unexpected error occurred while fetching the blocks.'
      }
*/
  try {
    res.json(blockchain.chain);
  } catch (error) {
    if (error instanceof Error) {
      // Type guard to check for Error object
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "An unknown error occurred." });
    }
  }
};

// Controller for mining a block
export const mineBlock = async (req: Request, res: Response) => {
  /*
      #swagger.auto = false
      #swagger.tags = ['Blocks']
      #swagger.path = '/blocks/mine'
      #swagger.method = 'post'
      #swagger.summary = 'Mine a new block'
      #swagger.description = 'Creates and adds a new block to the blockchain if the validator is authorized.'
      #swagger.parameters['privateKey'] = {
        in: 'query',
        description: 'Private key of the validator',
        required: true,
        type: 'string'
      }
      #swagger.responses[201] = {
        description: 'The newly mined block.',
        schema: { $ref: '#/definitions/Block' }
      }
      #swagger.responses[400] = {
        description: 'Bad Request',
        schema: { type: 'string', example: 'Invalid validator address' }
      }
      #swagger.responses[500] = {
        description: 'Internal Server Error',
        schema: { type: 'string', example: 'An error occurred while mining the block' }
      }
  */
  try {
    const { privateKey } = req.query;

    if (!privateKey || typeof privateKey !== "string") {
      return res.status(400).json({ error: "Invalid validator address" });
    }

    // Validate the validator
    if (blockchain.selectValidator() !== privateKey) {
      return res.status(400).json({ error: "Not authorized to mine" });
    }

    // Get valid transactions from the pool
    const validTransactions = transactionPool.transactions.filter((tx) =>
      blockchain.isValidTransaction(tx)
    );

    // Create new block with the valid transactions and validator info
    const newBlock = new Block({
      index: blockchain.chain.length,
      previousHash: blockchain.chain[blockchain.chain.length - 1].hash,
      timestamp: Date.now(),
      transactions: validTransactions,
      validator: getPublicKeyFromPrivateKey(privateKey), // Ensure the validatorAddress is a string
      signature: "", // You might want to generate or receive a signature here
    });

    // Add the new block to the blockchain
    const success = blockchain.addBlock(newBlock);

    if (success) {
      // Clear the transaction pool
      transactionPool.transactions = []; // Empty the pool after mining

      res.status(201).json(newBlock);
    } else {
      res.status(400).json({ error: "Block validation failed" });
    }
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "An unknown error occurred." });
    }
  }
};

export const getBlockByIndex = (req: Request, res: Response) => {
  /*
    #swagger.auto = false
    #swagger.tags = ['Blocks']
    #swagger.path = '/blocks/index/{index}'
    #swagger.method = 'get'
    #swagger.summary = 'Get Block By Index'
    #swagger.description = 'Retrieves a block by its index in the blockchain.'
    #swagger.parameters['index'] = {
        in: 'path',
        description: 'Index of the block to retrieve.',
        required: true,
        type: 'integer'
    }
    #swagger.responses[200] = {
        description: 'The requested block.',
        schema: { $ref: '#/definitions/Block' }
    }
    #swagger.responses[404] = {
        description: 'Block not found.'
    }
  */
  try {
    const index = parseInt(req.params.index, 10);

    if (isNaN(index)) {
      return res.status(400).json({ error: "Invalid block index" });
    }

    const block = blockchain.chain[index];
    if (!block) {
      return res.status(404).json({ error: "Block not found" });
    }

    res.json(block);
  } catch (error) {
    res
      .status(500)
      .json({ error: "An error occurred while fetching the block" });
  }
};

export const getBlockByHash = (req: Request, res: Response) => {
  /*
    #swagger.auto = false
    #swagger.tags = ['Blocks']
    #swagger.path = '/blocks/hash/{hash}'
    #swagger.method = 'get'
    #swagger.summary = 'Get Block By Hash'
    #swagger.description = 'Retrieves a block by its hash value.'
    #swagger.parameters['hash'] = {
        in: 'path',
        description: 'Hash of the block to retrieve.',
        required: true,
        type: 'string'
    }
    #swagger.responses[200] = {
        description: 'The requested block.',
        schema: { $ref: '#/definitions/Block' }
    }
    #swagger.responses[404] = {
        description: 'Block not found.'
    }
  */
  try {
    const hash = req.params.hash;
    const block = blockchain.chain.find((b) => b.hash === hash);

    if (!block) {
      return res.status(404).json({ error: "Block not found" });
    }

    res.json(block);
  } catch (error) {
    res
      .status(500)
      .json({ error: "An error occurred while fetching the block" });
  }
};

// Register validator for blockchain, receives the public key and stake of the validator
export const registerValidator = (req: Request, res: Response) => {
  /*
      #swagger.auto = false
      #swagger.tags = ['Validators']
      #swagger.path = '/blocks/register'
      #swagger.method = 'post'
      #swagger.summary = 'Register a new validator'
      #swagger.description = 'Registers a new validator with the blockchain.'
      #swagger.requestBody = {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: 'object',
              required: ['privateKey', 'stake'],
              properties: {
                privateKey: { type: 'string' },
                stake: { type: 'number' }
              }
            }
          }
        }
      }
      #swagger.responses[200] = {
        description: 'Validator registered successfully.'
      }
      #swagger.responses[400] = {
        description: 'Bad Request',
        schema: { type: 'string', example: 'Invalid public key or stake' }
      }
      #swagger.responses[500] = {
        description: 'Internal Server Error',
        schema: { type: 'string', example: 'An error occurred while registering the validator' }
      }
  */
  try {
    const { privateKey, stake } = req.body;

    if (
      !privateKey ||
      typeof privateKey !== "string" ||
      isNaN(stake) ||
      stake < 0
    ) {
      return res.status(400).json({ error: "Invalid public key or stake" });
    }

    const currentStake = blockchain.isValidatorRegistered(privateKey);
    const diff = stake - currentStake;
    const address = getPublicKeyFromPrivateKey(privateKey);

    if (diff === 0) {
      return res.status(200).json({ message: "Validator stake unchanged" });
    }

    if (diff < 0) {
      const refundTransaction = blockchain.createRewardTransaction(
        privateKey,
        -diff
      );
      const newBlock = new Block({
        index: blockchain.chain.length,
        previousHash: blockchain.getLatestBlock().hash,
        timestamp: Date.now(),
        transactions: [refundTransaction],
        validator: "LCD Wallet",
        signature: "", // Add logic to create a signature
      });

      newBlock.hash = newBlock.calculateHash();
      newBlock.signature = `Refund${Date.now().toString()}`; // Sign the block
      if (blockchain.addBlock(newBlock)) {
        broadcastNewBlock(newBlock);
        broadcastBalanceUpdate(address, blockchain.getBalance(address));
        broadcastTransactionHistory(
          address,
          blockchain.getTransactionHistory(address)
        );
        blockchain.registerValidator(privateKey, stake);
      }
      return res.status(200).json({
        message:
          currentStake == 0
            ? "Validator registered successfully"
            : "Validator stake updated successfully",
        stake,
      });
    }

    const balance = blockchain.getBalance(address);
    if (balance < diff) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // Create a transaction for the stake
    // Create the inputs for the transaction
    const unspentTxOuts = blockchain.getUnspentTxOuts(address);
    let accumulatedAmount = 0;
    const txIns: TxIn[] = [];

    for (const uTxO of unspentTxOuts) {
      accumulatedAmount += uTxO.amount;
      txIns.push(
        new TxIn({
          txOutId: uTxO.txOutId,
          txOutIndex: uTxO.txOutIndex,
          signature: "",
        })
      );
      if (accumulatedAmount >= diff) break;
    }

    if (accumulatedAmount < diff) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // Create the outputs for the transaction
    const txOuts: TxOut[] = [
      new TxOut({ address: "LCD Wallet", amount: diff }),
    ];
    if (accumulatedAmount > diff) {
      txOuts.push(
        new TxOut({ address: address, amount: accumulatedAmount - diff })
      );
    }

    const transaction = new Transaction({ txIns, txOuts });

    // Sign the transaction
    transaction.signTransaction(privateKey);

    const newBlock1 = new Block({
      index: blockchain.chain.length,
      previousHash: blockchain.getLatestBlock().hash,
      timestamp: Date.now(),
      transactions: [transaction],
      validator: "LCD Wallet",
      signature: "", // Add logic to create a signature
    });

    newBlock1.hash = newBlock1.calculateHash();
    newBlock1.signature = blockchain.signBlock(newBlock1, privateKey); // Sign the block
    if (blockchain.addBlock(newBlock1)) {
      broadcastNewBlock(newBlock1);
      broadcastBalanceUpdate(address, blockchain.getBalance(address));
      broadcastTransactionHistory(
        address,
        blockchain.getTransactionHistory(address)
      );
      blockchain.registerValidator(privateKey, stake);
    }

    if (currentStake == 0) {
      res
        .status(200)
        .json({ message: "Validator register successfully", stake });
    } else {
      res
        .status(200)
        .json({ message: "Validator stake updated successfully", stake });
    }
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "An unknown error occurred." });
    }
  }
};

// Check if a validator is registered
export const isValidatorRegistered = (req: Request, res: Response) => {
  // check validator by provide privateKey and publicKey
  /* 
        #swagger.auto = false
        #swagger.tags = ['Validators']
        #swagger.path = '/blocks/registered/{privateKey}/{publicKey}'
        #swagger.method = 'get'
        #swagger.summary = 'Check if a validator is registered'
        #swagger.description = 'Checks if a validator is registered with the blockchain.'
        #swagger.parameters['privateKey'] = {
            in: 'path',
            description: 'Private key of the validator.',
            required: true,
            type: 'string'
        }
        #swagger.responses[200] = {
            description: 'Validator registration status.',
            schema: { type: 'boolean' }
        }
        #swagger.responses[400] = {
            description: 'Bad Request',
            schema: { type: 'string', example: 'Invalid public key' }
        }
        #swagger.responses[500] = {
            description: 'Internal Server Error',
            schema: { type: 'string', example: 'An error occurred while checking the validator' }
        }
    */
  try {
    const { privateKey } = req.params;

    if (!privateKey || typeof privateKey !== "string") {
      return res.status(400).json({ error: "Invalid public key" });
    }

    const stake = blockchain.isValidatorRegistered(privateKey);

    res.status(200).json({ stake: stake });
  } catch (error) {
    res
      .status(500)
      .json({ error: "An error occurred while checking the validator" });
  }
};

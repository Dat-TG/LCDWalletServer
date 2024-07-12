import { Request, Response } from "express";
import Blockchain from "../models/blockchain/blockchain";
import Transaction from "../models/transaction/Transaction";
import TxIn from "../models/transaction/TxIn";
import TxOut from "../models/transaction/TxOut";
import { ec as EC } from "elliptic";
import blockchain from "../instances/blockchainInstance";
import { TransactionDetails } from "../types/transactionDetails";
const ec = new EC("secp256k1");

export const sendTransaction = (req: Request, res: Response) => {
  /*
      #swagger.auto = false
      #swagger.tags = ['Transactions']
      #swagger.path = '/transactions/send'
      #swagger.method = 'post'
      #swagger.summary = 'Send a new transaction'
      #swagger.description = 'Creates and sends a new transaction from the specified wallet.'
      #swagger.requestBody = {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: 'object',
              required: ['fromAddress', 'toAddress', 'amount', 'privateKey'],
              properties: {
                fromAddress: { type: 'string' },
                toAddress: { type: 'string' },
                amount: { type: 'number' },
                privateKey: { type: 'string' }
              }
            }
          }
        }
      }
      #swagger.responses[200] = {
        description: 'Transaction successfully created and sent.',
        schema: { $ref: '#/definitions/Transaction' }
      }
      #swagger.responses[400] = {
        description: 'Invalid transaction details.'
      }
      #swagger.responses[500] = {
        description: 'Internal Server Error. An unexpected error occurred while processing the transaction.'
      }
  */
  try {
    const { fromAddress, toAddress, amount, privateKey } = req.body;

    if (!fromAddress || !toAddress || !amount || !privateKey) {
      return res
        .status(400)
        .json({ error: "Missing required transaction details" });
    }

    // Validate private key
    if (!privateKey || typeof privateKey !== "string") {
      return res.status(400).json({ error: "Invalid private key" });
    }

    // Create a new elliptic curve key pair from the private key
    const ec = new EC("secp256k1");
    const keyPair = ec.keyFromPrivate(privateKey);

    // Get the public key in hexadecimal format
    const publicKey = keyPair.getPublic("hex");

    // Validate the fromAddress
    if (fromAddress !== publicKey) {
      return res
        .status(400)
        .json({ error: "Invalid from address or privateKey" });
    }

    // Create the inputs for the transaction
    const unspentTxOuts = blockchain.getUnspentTxOuts(fromAddress);
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
      if (accumulatedAmount >= amount) break;
    }

    if (accumulatedAmount < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // Create the outputs for the transaction
    const txOuts: TxOut[] = [new TxOut({ address: toAddress, amount })];
    if (accumulatedAmount > amount) {
      txOuts.push(
        new TxOut({ address: fromAddress, amount: accumulatedAmount - amount })
      );
    }

    const transaction = new Transaction({ txIns, txOuts });

    console.log("transaction", transaction.txIns, transaction.txOuts);

    // Sign the transaction
    transaction.signTransaction(privateKey);

    // Add the transaction to the pool
    blockchain.addTransaction(transaction);

    blockchain.mineBlock();

    res.status(200).json(transaction);
  } catch (error) {
    res
      .status(500)
      .json({ error: "An error occurred while sending the transaction" });
  }
};

// Controller to get details of a transaction by its ID
export const getTransactionDetails = (req: Request, res: Response) => {
  /*
      #swagger.auto = false
      #swagger.tags = ['Transactions']
      #swagger.path = '/transactions/id/{id}'
      #swagger.method = 'get'
      #swagger.summary = 'Get transaction details'
      #swagger.description = 'Returns the details of a transaction by its ID.'
      #swagger.parameters['id'] = {
          in: 'path',
          description: 'Transaction ID',
          required: true,
          type: 'string'
      }
      #swagger.responses[200] = {
          description: 'Transaction details',
          schema: { $ref: '#/definitions/Transaction' }
      }
      #swagger.responses[400] = {
          description: 'Invalid request'
      }
      #swagger.responses[404] = {
          description: 'Transaction not found'
      }
      #swagger.responses[500] = {
          description: 'Internal Server Error'
      }
  */
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Invalid transaction ID" });
    }

    const transaction = blockchain.getTransactionById(id);

    if (transaction) {
      res.status(200).json(transaction);
    } else {
      res.status(404).json({ error: "Transaction not found" });
    }
  } catch (error) {
    res.status(500).json({
      error: "An error occurred while getting the transaction details",
    });
  }
};

// Controller to get the current transaction pool
export const getTransactionPool = (req: Request, res: Response) => {
  /*
      #swagger.auto = false
      #swagger.tags = ['Transactions']
      #swagger.path = '/transactions/pool'
      #swagger.method = 'get'
      #swagger.summary = 'Get current transaction pool'
      #swagger.description = 'Returns the current transaction pool.'
      #swagger.responses[200] = {
          description: 'Current transaction pool',
          schema: { type: 'array', items: { $ref: '#/definitions/Transaction' } }
      }
      #swagger.responses[500] = {
          description: 'Internal Server Error'
      }
  */
  try {
    const transactionPool = blockchain.getTransactionPool();
    res.status(200).json(transactionPool);
  } catch (error) {
    res
      .status(500)
      .json({ error: "An error occurred while getting the transaction pool" });
  }
};

// Controller to get transaction history of a wallet
export const getTransactionHistory = (req: Request, res: Response) => {
  /*
      #swagger.auto = false
      #swagger.tags = ['Transactions']
      #swagger.path = '/transactions/history/{address}'
      #swagger.method = 'get'
      #swagger.summary = 'Get transaction history of a wallet'
      #swagger.description = 'Returns the transaction history of the specified wallet address.'
      #swagger.parameters['address'] = {
          in: 'path',
          description: 'Wallet address',
          required: true,
          type: 'string'
      }
      #swagger.responses[200] = {
          description: 'Successful response',
          schema: { type: 'array', items: { $ref: '#/definitions/Transaction' } }
      }
      #swagger.responses[400] = {
          description: 'Address is required'
      }
      #swagger.responses[500] = {
          description: 'Internal Server Error'
      }
  */
  const { address } = req.params;

  if (!address) {
    return res.status(400).json({ error: "Address is required" });
  }

  try {
    const transactions: TransactionDetails[] =
      blockchain.getTransactionHistory(address);
    return res.status(200).json(transactions);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

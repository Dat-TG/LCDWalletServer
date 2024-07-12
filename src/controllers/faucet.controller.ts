import { Request, Response } from "express";
import TxOut from "../models/transaction/TxOut";
import Transaction from "../models/transaction/Transaction";
import TxIn from "../models/transaction/TxIn";
import blockchain from "../instances/blockchainInstance";
import Block from "../models/blockchain/block";

const requestHistory: Map<string, number> = new Map(); // Map to store last request time for each address

// Controller to send initial funds
export const requestInitialFunds = (req: Request, res: Response) => {
  /*
      #swagger.auto = false
      #swagger.tags = ['Wallet']
      #swagger.path = '/faucet'
      #swagger.method = 'post'
      #swagger.summary = 'Request initial funds'
      #swagger.description = 'Allows a wallet to request initial funds to start using the blockchain.'
      #swagger.requestBody = {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: 'object',
              required: ['address'],
              properties: {
                address: { type: 'string' }
              }
            }
          }
        }
      }
      #swagger.responses[200] = {
          description: 'Initial funds sent successfully'
      }
      #swagger.responses[500] = {
          description: 'Internal Server Error'
      }
  */
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ error: "Address is required" });
    }

    // Check if address has requested funds within the last 24 hours
    const lastRequestTime = requestHistory.get(address) || 0;
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const nextRequestTime = new Date(lastRequestTime + 24 * 60 * 60 * 1000);

    if (lastRequestTime >= twentyFourHoursAgo) {
      return res.status(400).json({
        error: `Address has already requested funds within the last 24 hours, come back after ${nextRequestTime}`,
        nextRequestTime,
      });
    }

    const initialTxOut = new TxOut({
      address,
      amount: 100, // Assign an initial amount
    });

    const genesisTransaction = new Transaction({
      txIns: [
        new TxIn({
          txOutId: `genesis-${address}-${new Date()}`,
          txOutIndex: 0,
          signature: "",
        }),
      ], // Simplified TxIn for initial distribution
      txOuts: [initialTxOut],
    });

    const block = new Block({
      index: blockchain.chain.length,
      timestamp: Date.now(),
      transactions: [genesisTransaction],
      previousHash: blockchain.chain[blockchain.chain.length - 1].hash,
      signature: "",
      validator: "genesis-validator",
    });

    blockchain.addBlock(block);

    // Update last request time for the address
    requestHistory.set(address, Date.now());

    return res.status(200).json({ message: "Initial funds sent successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "An error occurred while sending initial funds" });
  }
};

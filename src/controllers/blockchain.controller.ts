import { Request, Response } from "express"; // Assuming you're using Express.js
import Block from "../models/blockchain/block";
import TransactionPool from "../models/transaction/TransactionPool";
import blockchain from "../instances/blockchainInstance";

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
    const latestBlocks = blockchain.chain.slice(-5); // Get the last 5 blocks
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
      #swagger.parameters['validatorAddress'] = {
        in: 'query',
        description: 'Public key of the validator',
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
    const { validatorAddress } = req.query;

    if (!validatorAddress || typeof validatorAddress !== "string") {
      return res.status(400).json({ error: "Invalid validator address" });
    }

    // Validate the validator
    if (blockchain.selectValidator() !== validatorAddress) {
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
      validator: validatorAddress as string, // Ensure the validatorAddress is a string
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
              required: ['publicKey', 'stake'],
              properties: {
                publicKey: { type: 'string' },
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
    const { publicKey, stake } = req.body;

    if (!publicKey || typeof publicKey !== "string" || !stake || isNaN(stake)) {
      return res.status(400).json({ error: "Invalid public key or stake" });
    }

    blockchain.registerValidator(publicKey, stake);

    res.status(200).json({ message: "Validator registered successfully" });
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
  /*
      #swagger.auto = false
      #swagger.tags = ['Validators']
      #swagger.path = '/blocks/registered/{publicKey}'
      #swagger.method = 'get'
      #swagger.summary = 'Check if a validator is registered'
      #swagger.description = 'Verifies if a validator is registered with the blockchain.'
      #swagger.parameters['publicKey'] = {
        in: 'path',
        description: 'Public key of the validator to check.',
        required: true,
        type: 'string'
      }
      #swagger.responses[200] = {
        description: 'Validator is registered.',
        schema: { type: 'boolean' }
      }
      #swagger.responses[404] = {
        description: 'Validator is not registered.'
      }
  */
  try {
    const { publicKey } = req.params;

    if (!publicKey || typeof publicKey !== "string") {
      return res.status(400).json({ error: "Invalid public key" });
    }

    const isRegistered = blockchain.isValidatorRegistered(publicKey);

    if (isRegistered) {
      res.json(true);
    } else {
      res.status(404).json(false);
    }
  } catch (error) {
    res
      .status(500)
      .json({ error: "An error occurred while checking the validator" });
  }
};

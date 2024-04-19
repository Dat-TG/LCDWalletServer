import { Request, Response } from "express";
import BlockChain from "../models/blockchain";

const getBlocks = async (req: Request, res: Response) => {
  /*
    #swagger.auto = false
    #swagger.tags = ['Blockchain']
    #swagger.path = '/blockchain/get-blocks'
    #swagger.method = 'get'
    #swagger.responses[200] = {
      description: 'List of all blocks in the blockchain',
      schema: {blocks: []}
    }
    #swagger.responses[500] = {
      description: 'Error while fetching blocks',
      schema: {error: "Error message"}
    }
    */
  try {
    const blocks = BlockChain.blocks;
    res.status(200).json({ blocks });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const mineBlock = async (req: Request, res: Response) => {
  /*
        #swagger.auto = false
        #swagger.tags = ['Blockchain']
        #swagger.path = '/blockchain/mine-block'
        #swagger.method = 'post'
        #swagger.requestBody = {
            required: true,
            description: 'Data to be added to the block',
            type: 'object',
            content: {
                "application/json": {
                    schema: {
                        $ref: "#/components/schemas/MineBlockRequestBody"
                    }  
                }
            }
        } 
        #swagger.responses[200] = {
            description: 'Block mined successfully',
            schema: {newBlock: {index: 1, hash: "000000", previousHash: "000000", timestamp: 0, data: "Genesis Block", difficulty: 0, nonce: 0}}
        }
        #swagger.responses[500] = {
            description: 'Error while mining block',
            schema: {error: "Error message"}
        }
        */
  try {
    const data = req.body.data;
    const newBlock = BlockChain.generateNewBlock(data, 4);
    res.status(200).json({ newBlock });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export { getBlocks, mineBlock };

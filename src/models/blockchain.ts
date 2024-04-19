import Block from "./block";

const genesisBlock: Block = new Block({
  index: 0,
  hash: "000000",
  previousHash: "000000",
  timestamp: 0,
  data: "Genesis Block",
  difficulty: 0,
  nonce: 0,
});

class BlockChain {
  blocks: Block[];
  difficulty: number;
  adjustmentInterval: number;
  maxBlockGenerationTime: number;
  minBlockGenerationTime: number;
  constructor() {
    this.blocks = [genesisBlock];
    this.difficulty = 1;
    this.adjustmentInterval = 10; // Number of blocks before difficulty adjustment
    this.maxBlockGenerationTime = 10000; // Maximum block generation time in milliseconds
    this.minBlockGenerationTime = 5000; // Minimum block generation time in milliseconds
  }
  calculateHashForBlock(block: Block): string {
    return block.calculateHash();
  }
  getLatestBlock(): Block {
    return this.blocks[this.blocks.length - 1];
  }

  isValidNewBlock(newBlock: Block, previousBlock: Block): boolean {
    if (previousBlock.index + 1 !== newBlock.index) {
      console.log("Invalid index");
      return false;
    } else if (previousBlock.hash !== newBlock.previousHash) {
      console.log("Invalid previous hash");
      return false;
    } else if (this.calculateHashForBlock(newBlock) !== newBlock.hash) {
      console.log(
        `Invalid hash: ${this.calculateHashForBlock(newBlock)} != ${
          newBlock.hash
        }`
      );
      return false;
    }
    return true;
  }

  adjustDifficulty(): number {
    const latestBlock = this.getLatestBlock();
    if (
      latestBlock.index % this.adjustmentInterval === 0 &&
      latestBlock.index !== 0
    ) {
      const timeDiff =
        latestBlock.timestamp -
        this.blocks[latestBlock.index - this.adjustmentInterval].timestamp;
      if (timeDiff > this.maxBlockGenerationTime) {
        // Decrease difficulty
        if (this.difficulty > 1) {
          this.difficulty--;
        }
      } else if (timeDiff < this.minBlockGenerationTime) {
        // Increase difficulty
        this.difficulty++;
      }
    }
    return this.difficulty;
  }

  addBlockToChain(newBlock: Block): boolean {
    if (this.isValidNewBlock(newBlock, this.getLatestBlock())) {
      this.blocks.push(newBlock);
      this.adjustDifficulty();
      return true;
    }
    return false;
  }

  generateNewBlock(data: string, difficulty: number): Block {
    const latestBlock: Block = this.getLatestBlock();
    let nonce = 0;
    let hash = "";

    // Proof of Work - Finding a hash that meets the difficulty criteria
    do {
      nonce++;
      hash = new Block({
        index: latestBlock.index + 1,
        previousHash: latestBlock.hash,
        timestamp: Date.now(),
        hash: "",
        data,
        difficulty: this.difficulty,
        nonce,
      }).calculateHash();
    } while (
      hash.substring(0, this.difficulty) !==
      Array(this.difficulty + 1).join("0")
    );

    const newBlock = new Block({
      index: latestBlock.index + 1,
      hash,
      previousHash: latestBlock.hash,
      timestamp: Date.now(),
      data,
      difficulty: this.difficulty,
      nonce,
    });

    if (this.addBlockToChain(newBlock)) {
      return newBlock;
    } else {
      throw new Error("Error while adding block to chain");
    }
  }

  isValidChain(chain: Block[]): boolean {
    if (JSON.stringify(chain[0]) !== JSON.stringify(genesisBlock)) {
      return false;
    }
    let tempBlocks = [chain[0]];
    for (let i = 1; i < chain.length; i++) {
      if (this.isValidNewBlock(chain[i], tempBlocks[i - 1])) {
        tempBlocks.push(chain[i]);
      } else {
        return false;
      }
    }
    return true;
  }

  replaceChain(newChain: Block[]): boolean {
    if (this.isValidChain(newChain) && newChain.length > this.blocks.length) {
      console.log(
        "Received blockchain is valid. Replacing current blockchain with received blockchain"
      );
      this.blocks = newChain;
      return true;
    } else {
      console.log("Received blockchain is invalid");
      return false;
    }
  }
}

export default new BlockChain();

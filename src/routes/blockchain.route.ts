import express from "express";
import {
  getAllBlocks,
  getBlockByHash,
  getBlockByIndex,
  getLatestBlocks,
  mineBlock,
} from "../controllers/blockchain.controller";

const router = express.Router();

router.get("/latest", getLatestBlocks);
router.post("/mine", mineBlock);
router.get("/all", getAllBlocks);
router.get("/index/:index", getBlockByIndex);
router.get("/hash/:hash", getBlockByHash);

export default router;

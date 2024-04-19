import express from "express";
import { getBlocks, mineBlock } from "../controllers/blockchain.controller";

const router = express.Router();

router.get("/get-blocks", getBlocks);
router.post("/mine-block", mineBlock);

export default router;

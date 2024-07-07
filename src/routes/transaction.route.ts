import express from "express";
import {
  getTransactionDetails,
  getTransactionHistory,
  getTransactionPool,
  sendTransaction,
} from "../controllers/transaction.controller";

const router = express.Router();

router.post("/send", sendTransaction);
router.get("/id/:id", getTransactionDetails);
router.get("/pool", getTransactionPool);
router.get("/history/:address", getTransactionHistory);

export default router;

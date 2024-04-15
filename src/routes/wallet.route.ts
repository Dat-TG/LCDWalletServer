import express from "express";
import { createWallet } from "../controllers/wallet.controller";

const router = express.Router();

router.post("/create", createWallet);

export default router;

import express from "express";
import { requestInitialFunds } from "../controllers/faucet.controller";

const router = express.Router();

router.post("/", requestInitialFunds);

export default router;

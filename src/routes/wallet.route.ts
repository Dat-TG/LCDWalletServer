import express from "express";
import {
  accessWalletKeystore,
  createWalletKeystore,
} from "../controllers/wallet.controller";

const router = express.Router();

router.post("/create/keystore", createWalletKeystore);
router.post("/access/keystore", accessWalletKeystore);

export default router;

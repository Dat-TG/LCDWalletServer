import express from "express";
import {
  accessWalletKeystore,
  accessWalletMnemonic,
  accessWalletPrivateKey,
  createWalletKeystore,
  generateMnemonicPhrase,
  generateQuestion,
  getWalletBalance,
} from "../controllers/wallet.controller";

const router = express.Router();

router.post("/create/keystore", createWalletKeystore);
router.post("/access/keystore", accessWalletKeystore);
router.get("/generate/mnemonic", generateMnemonicPhrase);
router.get("/generate/question", generateQuestion);
router.post("/access/mnemonic", accessWalletMnemonic);
router.post("/access/privatekey", accessWalletPrivateKey);
router.get("/balance", getWalletBalance);

export default router;

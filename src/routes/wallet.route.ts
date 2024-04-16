import express from "express";
import {
  accessWalletKeystore,
  createWalletKeystore,
  generateMnemonicPhrase,
  generateQuestion,
} from "../controllers/wallet.controller";

const router = express.Router();

router.post("/create/keystore", createWalletKeystore);
router.post("/access/keystore", accessWalletKeystore);
router.get("/generate/mnemonic", generateMnemonicPhrase);
router.get("/generate/question", generateQuestion);

export default router;

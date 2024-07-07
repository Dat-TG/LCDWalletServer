import swaggerAutogen from "swagger-autogen";

const doc = {
  info: {
    version: "v1.0.0",
    title: "LCDWallet API Documentation",
    description: "Documentation for the LCDWallet API",
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Development server",
    },
  ],
  components: {
    schemas: {
      PasswordRequest: {
        password: "string",
      },
      WalletResponseSuccess: {
        message: "string",
        downloadUrl: "string",
      },
      WalletResponseError: {
        error: "string",
      },
      AccessKeystoreRequest: {
        iv: "string",
        salt: "string",
        encryptedData: "string",
        password: "string",
      },
      AccessWalletResponseSuccess: {
        privateKey: "string",
        publicKey: "string",
      },
      AccessWalletResponseError: {
        error: "string",
      },
      MnemonicResponseSuccess: {
        mnemonic: "string",
      },
      MnemonicResponseError: {
        name: "string",
        error: "string",
      },
      QuestionResponseSuccess: {
        question: ["option1", "option2", "option3"],
      },
      QuestionResponseError: {
        error: "string",
      },
      AccessMnemonicRequestBody: {
        mnemonic: "string",
      },
      AccessMnemonicResponseSuccess: {
        privateKey: "string",
        publicKey: "string",
      },
      AccessMnemonicResponseError: {
        error: "string",
      },
      AccessPrivateKeyRequestBody: {
        privateKey: "string",
      },
      AccessPrivateKeyResponseSuccess: {
        publicKey: "string",
      },
      AccessPrivateKeyResponseError: {
        error: "string",
      },
      MineBlockRequestBody: {
        data: "string",
      },
    },
  },
  definitions: {
    Block: {
      type: "object",
      properties: {
        index: { type: "number" },
        hash: { type: "string" },
        previousHash: { type: "string" },
        timestamp: { type: "number" },
        transactions: {
          type: "array",
          items: { $ref: "#/definitions/Transaction" },
        },
        validator: { type: "string" },
        signature: { type: "string" },
      },
    },

    Transaction: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Unique identifier of the transaction (usually a hash).",
        },
        txIns: {
          type: "array",
          description: "Array of transaction inputs (TxIn).",
          items: { $ref: "#/definitions/TxIn" },
        },
        txOuts: {
          type: "array",
          description: "Array of transaction outputs (TxOut).",
          items: { $ref: "#/definitions/TxOut" },
        },
      },
    },

    TxIn: {
      type: "object",
      properties: {
        txOutId: {
          type: "string",
          description: "Transaction ID of the UTXO being spent.",
        },
        txOutIndex: {
          type: "number",
          description: "Output index of the UTXO being spent.",
        },
        signature: {
          type: "string",
          description: "Signature proving ownership of the UTXO.",
        },
      },
    },

    TxOut: {
      type: "object",
      properties: {
        address: { type: "string", description: "Address of the recipient." },
        amount: {
          type: "number",
          description: "Amount of cryptocurrency being sent.",
        },
      },
    },
  },
};

const outputFile = "./swagger_output.json";
const endpointsFiles = ["./src/index.ts"];

swaggerAutogen({ openapi: "3.0.0" })(outputFile, endpointsFiles, doc);

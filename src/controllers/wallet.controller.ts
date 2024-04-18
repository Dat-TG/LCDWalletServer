import { NextFunction, Request, Response } from "express";
import { ec as EC } from "elliptic";
import crypto from "crypto";
import fs from "fs";
import { deriveKeyFromPassword } from "../utils/helper";
import * as bip39 from "bip39";
const ec = new EC("secp256k1");
const createWalletKeystore = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  /*  
      #swagger.auto = false
      #swagger.tags = ['Wallet']
      #swagger.path = '/wallet/create/keystore'
      #swagger.method = 'post'
      #swagger.produces = ['application/json']
      #swagger.consumes = ['application/json']
  
      #swagger.requestBody = {
            required: true,
            description: 'Password for encrypting the keystore file',
            type: 'object',
            content: {
                "application/json": {
                    schema: {
                        $ref: "#/components/schemas/PasswordRequest"
                    }  
                }
            }
        } 
  
      #swagger.responses[200] = {
          description: 'OK',
          schema: {
              $ref: "#/components/schemas/WalletResponseSuccess"
          }
      }
      #swagger.responses[400] = {
          description: 'Bad Request',
          schema: {
              $ref: "#/components/schemas/WalletResponseError"
          }
      }
  */
  try {
    const { password } = req.body;
    console.log("Password:", password); // Log password for debugging

    // Ensure that the password is provided and is a non-empty string
    if (typeof password !== "string" || password.trim() === "") {
      return res
        .status(400)
        .json({ error: "Password must be a non-empty string" });
    }

    // Create a new elliptic curve key pair
    const keyPair = ec.genKeyPair();

    // Get the private key and public key in hexadecimal format
    const privateKey = keyPair.getPrivate("hex");
    const publicKey = keyPair.getPublic("hex");

    // Create a keystore object with the private key and address (public key)
    const keystore = {
      address: publicKey,
      privateKey: privateKey,
    };

    // console.log("Keystore created:", keystore);

    // Serialize the keystore object to JSON
    const keystoreJson = JSON.stringify(keystore);

    // Generate a random filename for the keystore file
    const filename = `keystore_${Date.now()}.json`;

    // Encrypt the keystore JSON using the provided password
    const salt = crypto.randomBytes(16); // Generate a random salt
    const keyLength = 32; // For AES-256-CBC, use a key length of 32 bytes (256 bits)
    const key = deriveKeyFromPassword(password, salt, keyLength);
    const iv = crypto.randomBytes(16); // Generate a random IV
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    let encryptedKeystore = cipher.update(keystoreJson, "utf8", "hex");
    encryptedKeystore += cipher.final("hex");
    console.log("Keystore:", keystoreJson);
    console.log("Salt:", salt.toString("hex"));
    console.log("IV:", iv.toString("hex"));

    // Write the encrypted keystore data to a file
    fs.writeFileSync(
      filename,
      JSON.stringify({
        iv: iv.toString("hex"),
        salt: salt.toString("hex"),
        encryptedData: encryptedKeystore,
      })
    );

    // Set response headers for downloading the file
    res.setHeader("Content-disposition", `attachment; filename=${filename}`);
    res.setHeader("Content-type", "application/json");

    // Stream the file to the response
    const filestream = fs.createReadStream(filename);
    filestream.pipe(res);

    // Cleanup: delete the temporary keystore file
    filestream.on("close", () => {
      fs.unlinkSync(filename);
    });
  } catch (error: any) {
    console.error("Error creating wallet:", error);
    res.status(400).json({
      name: "WalletResponseError",
      error: `An error occurred while creating the wallet: ${error.message}`,
    });
  }
};

const accessWalletKeystore = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  /*  
      #swagger.auto = false
      #swagger.tags = ['Wallet']
      #swagger.path = '/wallet/access/keystore'
      #swagger.method = 'post'
      #swagger.produces = ['application/json']
      #swagger.consumes = ['application/json']
  
      #swagger.requestBody = {
            required: true,
            description: 'Password for encrypting the keystore file',
            type: 'object',
            content: {
                "application/json": {
                    schema: {
                        $ref: "#/components/schemas/AccessKeystoreRequest"
                    }  
                }
            }
        } 
  
      #swagger.responses[200] = {
          description: 'OK',
          schema: {
              $ref: "#/components/schemas/AccessWalletResponseSuccess"
          }
      }
      #swagger.responses[400] = {
          description: 'Bad Request',
          schema: {
              $ref: "#/components/schemas/AccessWalletResponseError"
          }
      }
  */
  try {
    // Extract IV, encryptedData, salt, and password from request body
    const { iv, encryptedData, salt, password } = req.body;

    // Validate required fields
    if (!iv || !encryptedData || !salt || !password) {
      return res
        .status(400)
        .json({ error: "IV, encryptedData, salt, and password are required" });
    }

    // Decode IV, salt, and encryptedData from base64
    const decodedIV = Buffer.from(iv, "hex");
    const decodedSalt = Buffer.from(salt, "hex");
    const decodedEncryptedData = Buffer.from(encryptedData, "hex");
    console.log("Decoded IV:", decodedIV.toString("hex"));
    console.log("Decoded Salt:", decodedSalt.toString("hex"));
    console.log(
      "Decoded Encrypted Data:",
      decodedEncryptedData.toString("hex")
    );

    // Derive key from password and salt
    const key = deriveKeyFromPassword(password, decodedSalt, 32); // Use 32 bytes (256 bits) key length

    // Decrypt the keystore using the provided key and IV
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, decodedIV);
    let decryptedData = decipher.update(decodedEncryptedData);
    decryptedData = Buffer.concat([decryptedData, decipher.final()]);

    // Parse decrypted data as JSON
    const decryptedKeystore = JSON.parse(decryptedData.toString("utf8"));

    // Extract private and public keys from decrypted keystore
    const privateKey = decryptedKeystore.privateKey;
    const publicKey = decryptedKeystore.address;

    // Use the private and public keys as needed
    // For example, you can return them in the response
    res.json({ privateKey, publicKey });
  } catch (error: any) {
    console.error("Error accessing wallet by keystore:", error);
    res
      .status(400)
      .json({ error: "Key derivation failed - possibly wrong passphrase" });
  }
};

const generateMnemonicPhrase = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  /*  
      #swagger.auto = false
      #swagger.tags = ['Wallet']
      #swagger.path = '/wallet/generate/mnemonic'
      #swagger.method = 'get'
      #swagger.produces = ['application/json']
  
      #swagger.responses[200] = {
          description: 'OK',
          schema: {
              $ref: "#/components/schemas/MnemonicResponseSuccess"
          }
      }
      #swagger.responses[400] = {
          description: 'Bad Request',
          schema: {
              $ref: "#/components/schemas/MnemonicResponseError"
          }
      }
  */
  try {
    // Generate a random mnemonic phrase (12 words)
    const mnemonic = bip39.generateMnemonic();
    res.json({ mnemonic });
  } catch (error: any) {
    console.error("Error generating mnemonic phrase:", error);
    res.status(400).json({
      name: "MnemonicResponseError",
      error: `An error occurred while generating the mnemonic phrase: ${error.message}`,
    });
  }
};

const generateQuestion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    /*  
      #swagger.auto = false
      #swagger.tags = ['Wallet']
      #swagger.path = '/wallet/generate/mnemonic'
      #swagger.method = 'get'
      #swagger.produces = ['application/json']

      #swagger.parameters['word'] = {
          in: 'query',
          description: 'The given word.',
          required: true,
          type: 'string'
      }

      #swagger.responses[200] = {
          description: 'OK',
          schema: {
              $ref: "#/components/schemas/QuestionResponseSuccess"
          }
      }

      #swagger.responses[400] = {
          description: 'Bad Request',
          schema: {
              $ref: "#/components/schemas/QuestionResponseError"
          }
      }
  */

    const givenWord = req.query.word as string;
    const randomWords: string[] = [];
    while (randomWords.length < 2) {
      const word =
        bip39.wordlists.english[
          Math.floor(Math.random() * bip39.wordlists.english.length)
        ];
      if (!randomWords.includes(word)) {
        randomWords.push(word);
      }
    }
    randomWords.push(givenWord);
    // Shuffle the randomWords array
    // Fisher-Yates shuffle algorithm
    for (let i = randomWords.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [randomWords[i], randomWords[j]] = [randomWords[j], randomWords[i]];
    }
    res.json({ question: randomWords });
  } catch (error: any) {
    console.error("Error generating question:", error);
    res.status(400).json({
      name: "QuestionResponseError",
      error: `An error occurred while generating the question: ${error.message}`,
    });
  }
};

const accessWalletMnemonic = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  /*  
  #swagger.tags = ['Wallet']
  #swagger.path = '/wallet/access/mnemonic'
  #swagger.method = 'post'
  #swagger.summary = 'Access wallet using mnemonic phrase'
  #swagger.description = 'Generate private and public keys for a wallet using a mnemonic phrase.'
  #swagger.requestBody = {
            required: true,
            description: 'Mnemonic phrases (12 words)',
            type: 'object',
            content: {
                "application/json": {
                    schema: {
                        $ref: "#/components/schemas/AccessMnemonicRequestBody"
                    }  
                }
            }
        } 
  #swagger.responses[200] = {
    description: 'OK',
    schema: {
      $ref: "#/definitions/AccessMnemonicResponseSuccess"
    }
  }
  #swagger.responses[400] = {
    description: 'Bad Request',
    schema: {
      $ref: "#/definitions/AccessMnemonicResponseError"
    }
  }
*/

  try {
    // Retrieve the mnemonic phrase from the request body
    const { mnemonic } = req.body;

    // Validate the mnemonic phrase
    if (!bip39.validateMnemonic(mnemonic)) {
      return res.status(400).json({ error: "Invalid mnemonic phrase" });
    }

    // Derive a seed buffer from the mnemonic phrase
    const seedBuffer = bip39.mnemonicToSeedSync(mnemonic);

    // Derive a key pair from the seed buffer
    const keyPair = ec.keyFromPrivate(seedBuffer.subarray(0, 32));

    // Get the private key in hexadecimal format
    const privateKeyHex = keyPair.getPrivate("hex");

    // Get the public key in uncompressed format
    const publicKeyHex = keyPair.getPublic("hex");

    // Return the generated private key and public key
    res.json({ privateKey: privateKeyHex, publicKey: publicKeyHex });
  } catch (error: any) {
    console.error("Error creating wallet from mnemonic:", error);
    res
      .status(500)
      .json({ error: "An error occurred while creating the wallet" });
  }
};

const accessWalletPrivateKey = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  /*  
  #swagger.tags = ['Wallet']
  #swagger.path = '/wallet/access/privatekey'
  #swagger.method = 'post'
  #swagger.summary = 'Access wallet using private key'
  #swagger.description = 'Generate public key for a wallet using a private key.'
  #swagger.requestBody = {
            required: true,
            description: 'Private key in hexadecimal format',
            type: 'object',
            content: {
                "application/json": {
                    schema: {
                        $ref: "#/components/schemas/AccessPrivateKeyRequestBody"
                    }  
                }
            }
        } 
  #swagger.responses[200] = {
    description: 'OK',
    schema: {
      $ref: "#/definitions/AccessPrivateKeyResponseSuccess"
    }
  }
  #swagger.responses[400] = {
    description: 'Bad Request',
    schema: {
      $ref: "#/definitions/AccessPrivateKeyResponseError"
    }
  }
*/

  try {
    // Private key in hexadecimal format
    const { privateKey } = req.body;

    // Validate private key
    if (!privateKey || typeof privateKey !== "string") {
      return res.status(400).json({ error: "Invalid private key" });
    }

    // Create a new elliptic curve key pair from the private key
    const ec = new EC("secp256k1");
    const keyPair = ec.keyFromPrivate(privateKey);

    // Get the public key in hexadecimal format
    const publicKey = keyPair.getPublic("hex");

    // Return the public key
    res.json({ publicKey });
  } catch (error: any) {
    console.error("Error creating wallet from private key:", error);
    res
      .status(500)
      .json({ error: "An error occurred while creating the wallet" });
  }
};

export {
  createWalletKeystore,
  accessWalletKeystore,
  generateMnemonicPhrase,
  generateQuestion,
  accessWalletMnemonic,
  accessWalletPrivateKey,
};

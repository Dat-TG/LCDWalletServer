import { NextFunction, Request, Response } from "express";
import { ec as EC } from "elliptic";
import crypto from "crypto";
import fs from "fs";
import { deriveKeyFromPassword } from "../utils/helper";
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
    const ec = new EC("secp256k1");
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
    res.status(400).json({ error: `An error occurred: ${error.message}` });
  }
};

export { createWalletKeystore, accessWalletKeystore };

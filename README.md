# LCDWallet Server

## Overview

LCDWallet Server is the backend server for a blockchain cryptocurrency system utilizing Proof of Stake (PoS) consensus mechanism. It is developed using NodeJS, ExpressJS, and TypeScript, with real-time updates facilitated by WebSocket.

You can find the frontend repository here: [https://github.com/Dat-TG/LCDWallet](https://github.com/Dat-TG/LCDWallet)

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Details](#project-details)
- [Proof of Stake Workflow](#proof-of-stake-workflow)
- [Installation and Running Locally](#installation-and-running-locally)
- [API Documentation](#api-documentation)
- [Contributors](#contributors)
- [Additional Information](#additional-information)

## Features

- Create wallet by keystore file (password) or by mnemonic phrase
- Login using keystore file, mnemonic phrase, or private key
- Send transactions
- Faucet for getting free tokens
- Register as a validator
- View latest blocks
- View transaction history
- View transaction statistics
- View balance
- View transaction pool
- View mining statistics
- Real-time updates via WebSocket
- Logout
- Change stake or unregister as a validator

## Tech Stack

- NodeJS
- ExpressJS
- TypeScript
- WebSocket

## Project Details

- **Student ID:** 20120454
- **Name:** Cong-Dat Le
- **Instructor:** M.S. Van-Quy Tran, M.S. Duy-Quang Tran, M.S. Nguyen-Kha Do
- **Module:** Advanced Topics in Software Development Technology

## Proof of Stake Workflow

1. **Validator Selection**: Validators are chosen based on their stake. Higher stakes increase the chances of being selected.
2. **Block Creation**: The selected validator creates a new block, signs it, and broadcasts it to the network.
3. **Transaction Verification**: Other nodes in the network verify the transactions in the new block.
4. **Block Addition**: Once verified, the block is added to the blockchain, and the validator receives a reward.
5. **Consensus Maintenance**: The network maintains consensus by accepting the longest valid chain.

## Installation and Running Locally

### Prerequisites

- NodeJS
- npm (Node Package Manager)

### Steps

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/LCDWallet-Server.git
   cd LCDWalletServer
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Run the server**

   ```bash
   npm start
   ```

4. **Access the API documentation**
   Open your browser and navigate to: [http://localhost:3000/api-docs/](http://localhost:3000/api-docs/)

## API Documentation

Detailed API documentation is available at: [http://localhost:3000/api-docs/](http://localhost:3000/api-docs/)

## Contributors

- **Cong-Dat Le** (Student ID: 20120454)

## Additional Information

For any additional information, improvements, or queries, please feel free to contribute or reach out.

- Email: [dat13102k2@gmail.com](mailto:dat13102k2@gmail.com)
- Email: [20120454@student.hcmus.edu.vn](mailto:20120454@student.hcmus.edu.vn)
- Github: [Dat-TG](https://github.com/Dat-TG)

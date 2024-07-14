import WebSocket, { Server as WebSocketServer } from "ws";
import http from "http";
import Block from "./models/blockchain/block";
import { TransactionDetails } from "./types/transactionDetails";

const sockets: WebSocket[] = [];

export const initWebSocketServer = (server: http.Server) => {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws: WebSocket) => {
    sockets.push(ws);
    console.log("Client connected");

    ws.on("message", (message: string) => {
      console.log("Received:", message);
    });

    ws.on("close", () => {
      sockets.splice(sockets.indexOf(ws), 1);
      console.log("Client disconnected");
    });
  });

  return wss;
};

export const broadcast = (message: any) => {
  sockets.forEach((socket) => {
    socket.send(JSON.stringify(message));
  });
};

export const broadcastNewBlock = (block: Block) => {
  broadcast({ type: "NEW_BLOCK", block });
};

export const broadcastTransactionHistory = (
  address: string,
  transactions: TransactionDetails[]
) => {
  broadcast({ type: "TRANSACTION_HISTORY", address, transactions });
};

export const broadcastBalanceUpdate = (address: string, balance: number) => {
  broadcast({ type: "BALANCE_UPDATE", address, balance });
};

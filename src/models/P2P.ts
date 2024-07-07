import WebSocket from "ws";
import blockchain from "../instances/blockchainInstance";

const sockets: WebSocket[] = [];

const MessageType = {
  QUERY_LATEST: 0,
  QUERY_ALL: 1,
  RESPONSE_BLOCKCHAIN: 2,
  TRANSACTION: 3,
};

// Initialize P2P server
const initP2PServer = (p2pPort: number) => {
  const server = new WebSocket.Server({ port: p2pPort });

  server.on("connection", (ws: WebSocket) => {
    initConnection(ws);
  });

  console.log(`Listening websocket p2p port on: ${p2pPort}`);
};

const initConnection = (ws: WebSocket) => {
  sockets.push(ws);
  initMessageHandler(ws);
  initErrorHandler(ws);
  write(ws, queryChainLengthMsg());
};

const initMessageHandler = (ws: WebSocket) => {
  ws.on("message", (data: string) => {
    const message = JSON.parse(data);
    switch (message.type) {
      case MessageType.QUERY_LATEST:
        write(ws, responseLatestMsg());
        break;
      case MessageType.QUERY_ALL:
        write(ws, responseChainMsg());
        break;
      case MessageType.RESPONSE_BLOCKCHAIN:
        handleBlockchainResponse(message);
        break;
      case MessageType.TRANSACTION:
        handleTransaction(message);
        break;
    }
  });
};

const write = (ws: WebSocket, message: any) => ws.send(JSON.stringify(message));

const queryChainLengthMsg = () => ({ type: MessageType.QUERY_LATEST });
const queryAllMsg = () => ({ type: MessageType.QUERY_ALL });

const responseChainMsg = () => ({
  type: MessageType.RESPONSE_BLOCKCHAIN,
  data: JSON.stringify(blockchain.chain),
});

const responseLatestMsg = () => ({
  type: MessageType.RESPONSE_BLOCKCHAIN,
  data: JSON.stringify([blockchain.getLatestBlock()]),
});

const handleBlockchainResponse = (message: any) => {
  const receivedBlocks = JSON.parse(message.data);
  const latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
  const latestBlockHeld = blockchain.getLatestBlock();

  if (latestBlockReceived.index > latestBlockHeld.index) {
    if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
      blockchain.addBlock(latestBlockReceived);
      broadcast(responseLatestMsg());
    } else if (receivedBlocks.length === 1) {
      broadcast(queryAllMsg());
    } else {
      blockchain.replaceChain(receivedBlocks);
    }
  }
};

const handleTransaction = (message: any) => {
  const transaction = message.data;
  blockchain.addTransaction(transaction);
  broadcastTransaction(transaction);
};

const broadcast = (message: any) =>
  sockets.forEach((socket) => write(socket, message));

const broadcastTransaction = (transaction: any) => {
  broadcast({ type: MessageType.TRANSACTION, data: transaction });
};

const initErrorHandler = (ws: WebSocket) => {
  const closeConnection = (ws: WebSocket) => {
    console.log("connection failed to peer:", ws.url);
    sockets.splice(sockets.indexOf(ws), 1);
  };

  ws.on("close", () => closeConnection(ws));
  ws.on("error", () => closeConnection(ws));
};

// Initialize the P2P server on port 6001
initP2PServer(6001);

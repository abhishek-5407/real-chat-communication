import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { WebSocketServer } from "ws";

import connectDB from "./config/db.js";
import { getMessages } from "./controllers/messageController.js";
import { handleConnection } from "./controllers/socketController.js";

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/messages/:user1/:user2", getMessages);

const server = http.createServer(app);

const wss = new WebSocketServer({ server });

wss.on("connection", handleConnection);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

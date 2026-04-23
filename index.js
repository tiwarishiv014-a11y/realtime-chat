import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import socketHandler from "./socket/socketHandler.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// ── Middleware ──
app.use(express.json());
app.use(express.static(join(__dirname, "public")));

// ── Routes ──
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);

// ── Socket ──
socketHandler(io);

// ── Start ──
connectDB().then(() => {
  server.listen(process.env.PORT || 5000, () => {
    console.log(`🚀 Server running at http://localhost:${process.env.PORT || 5000}`);
  });
});
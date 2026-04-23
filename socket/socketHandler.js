import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Message from "../models/Message.js";
import Room from "../models/Room.js";

// userId → socketId map for online tracking
const onlineUsers = new Map();

const socketHandler = (io) => {

  // ── Auth middleware for Socket ──────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error("Authentication error: no token"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user    = await User.findById(decoded.id).select("-password");
      if (!user) return next(new Error("User not found"));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.user._id.toString();
    console.log(`🟢 Connected: ${socket.user.name} (${userId})`);

    // Mark online
    onlineUsers.set(userId, socket.id);
    await User.findByIdAndUpdate(userId, { isOnline: true });

    // Notify others
    socket.broadcast.emit("user_online", { userId, name: socket.user.name });

    // Send online list to this user
    socket.emit("online_users", Array.from(onlineUsers.keys()));

    // ── JOIN ROOM ───────────────────────────────────────────────
    socket.on("join_room", async ({ roomId }) => {
      try {
        const room = await Room.findOne({ _id: roomId, members: userId });
        if (!room) return socket.emit("error", { message: "Access denied" });

        socket.join(roomId);

        // Send last 50 messages
        const messages = await Message.find({ roomId })
          .populate("sender", "name phone avatar")
          .sort({ createdAt: -1 })
          .limit(50);

        socket.emit("message_history", messages.reverse());
      } catch {
        socket.emit("error", { message: "Failed to join room" });
      }
    });

    // ── SEND MESSAGE ────────────────────────────────────────────
    socket.on("send_message", async ({ roomId, content }) => {
      try {
        if (!content?.trim()) return;

        const room = await Room.findOne({ _id: roomId, members: userId });
        if (!room) return socket.emit("error", { message: "Access denied" });

        const message = await Message.create({
          roomId,
          sender:  userId,
          content: content.trim(),
          readBy:  [{ userId, readAt: new Date() }], // sender auto-reads
        });

        // Update room's lastMessage
        await Room.findByIdAndUpdate(roomId, { lastMessage: message._id });

        const populated = await message.populate("sender", "name phone avatar");

        io.to(roomId).emit("receive_message", populated);
      } catch {
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // ── READ RECEIPT (single message) ───────────────────────────
    socket.on("message_read", async ({ roomId, messageId }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) return;

        const alreadyRead = message.readBy.some(
          (r) => r.userId.toString() === userId
        );

        if (!alreadyRead) {
          message.readBy.push({ userId, readAt: new Date() });
          await message.save();
        }

        io.to(roomId).emit("read_receipt", {
          messageId,
          userId,
          userName: socket.user.name,
          readAt:   new Date(),
        });
      } catch {
        socket.emit("error", { message: "Failed to mark as read" });
      }
    });

    // ── MARK ENTIRE ROOM AS READ ────────────────────────────────
    socket.on("mark_room_read", async ({ roomId }) => {
      try {
        const unread = await Message.find({
          roomId,
          "readBy.userId": { $ne: userId },
        });

        for (const msg of unread) {
          msg.readBy.push({ userId, readAt: new Date() });
          await msg.save();
        }

        io.to(roomId).emit("room_read", { roomId, userId });
      } catch {
        socket.emit("error", { message: "Failed to mark room as read" });
      }
    });

    // ── TYPING INDICATORS ───────────────────────────────────────
    socket.on("typing", ({ roomId }) => {
      socket.to(roomId).emit("user_typing", {
        userId,
        name: socket.user.name,
      });
    });

    socket.on("stop_typing", ({ roomId }) => {
      socket.to(roomId).emit("user_stop_typing", { userId });
    });

    // ── DISCONNECT ──────────────────────────────────────────────
    socket.on("disconnect", async () => {
      console.log(`🔴 Disconnected: ${socket.user.name}`);
      onlineUsers.delete(userId);

      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeen: new Date(),
      });

      socket.broadcast.emit("user_offline", {
        userId,
        name:     socket.user.name,
        lastSeen: new Date(),
      });
    });
  });
};

export default socketHandler;
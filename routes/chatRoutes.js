import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getOrCreatePrivateRoom,
  createGroupRoom,
  getMyRooms,
  getMessages,
} from "../controllers/chatController.js";

const router = Router();

// POST /api/chat/room/private
router.post("/room/private", protect, getOrCreatePrivateRoom);

// POST /api/chat/room/group
router.post("/room/group", protect, createGroupRoom);

// GET /api/chat/rooms
router.get("/rooms", protect, getMyRooms);

// GET /api/chat/messages/:roomId?page=1
router.get("/messages/:roomId", protect, getMessages);

export default router;
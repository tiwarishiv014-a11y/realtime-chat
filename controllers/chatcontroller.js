import Room from "../models/Room.js";
import Message from "../models/Message.js";

// ── Get or Create 1-on-1 Room ─────────────────────────────────────
export const getOrCreatePrivateRoom = async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const myId = req.user._id;

    let room = await Room.findOne({
      isGroup: false,
      members: { $all: [myId, targetUserId], $size: 2 },
    }).populate("members", "-password");

    if (!room) {
      room = await Room.create({ isGroup: false, members: [myId, targetUserId] });
      room = await room.populate("members", "-password");
    }

    return res.json(room);
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ── Create Group Room ─────────────────────────────────────────────
export const createGroupRoom = async (req, res) => {
  try {
    const { name, memberIds } = req.body;
    const myId = req.user._id;

    const allMembers = [...new Set([myId.toString(), ...memberIds])];

    let room = await Room.create({
      name,
      isGroup: true,
      members: allMembers,
      admin: myId,
    });

    room = await room.populate("members", "-password");
    return res.status(201).json(room);
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ── Get My Rooms ──────────────────────────────────────────────────
export const getMyRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ members: req.user._id })
      .populate("members", "-password")
      .populate("lastMessage")
      .sort({ updatedAt: -1 });

    return res.json(rooms);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// ── Get Message History (paginated) ──────────────────────────────
export const getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const page  = parseInt(req.query.page) || 1;
    const limit = 50;
    const skip  = (page - 1) * limit;

    // Verify membership
    const room = await Room.findOne({ _id: roomId, members: req.user._id });
    if (!room) return res.status(403).json({ message: "Access denied" });

    const messages = await Message.find({ roomId })
      .populate("sender", "name phone avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.json(messages.reverse()); // oldest first
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};
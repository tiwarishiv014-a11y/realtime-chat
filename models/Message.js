import mongoose from "mongoose";

const readReceiptSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    readAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    roomId:  { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
    sender:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true, trim: true },
    readBy:  [readReceiptSchema], // read receipts
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);

export default Message;
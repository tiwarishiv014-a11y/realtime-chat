import mongoose from "mongoose";
import bcryptjs from "bcryptjs";

const { hash, compare } = bcryptjs;

const userSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    phone:    { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    avatar:   { type: String, default: "" },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcryptjs.hash(this.password, 10);
});
// Instance method to compare password
userSchema.methods.comparePassword = async function (password) {
  return compare(password, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
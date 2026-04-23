import { validationResult } from "express-validator";
import User from "../models/User.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/token.js";

// ── Register ─────────────────────────────────────────────────────
export const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  try {
    const { name, phone, password } = req.body;

    const exists = await User.findOne({ phone });
    if (exists)
      return res.status(400).json({ message: "Phone already registered" });

    const user = await User.create({ name, phone, password });

    const accessToken  = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    return res.status(201).json({
      message: "Registered successfully",
      accessToken,
      refreshToken,
      user: { id: user._id, name: user.name, phone: user.phone },
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ── Login ────────────────────────────────────────────────────────
export const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  try {
    const { phone, password } = req.body;

    const user = await User.findOne({ phone });
    if (!user)
      return res.status(400).json({ message: "Invalid credentials" });

    const match = await user.comparePassword(password);
    if (!match)
      return res.status(400).json({ message: "Invalid credentials" });

    const accessToken  = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    return res.json({
      message: "Login successful",
      accessToken,
      refreshToken,
      user: { id: user._id, name: user.name, phone: user.phone },
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ── Refresh Token ────────────────────────────────────────────────
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;   // renamed to avoid shadowing
    if (!token)
      return res.status(400).json({ message: "Refresh token required" });

    const decoded = verifyRefreshToken(token);
    const user    = await User.findById(decoded.id);
    if (!user)
      return res.status(401).json({ message: "User not found" });

    const accessToken = generateAccessToken(user._id);
    return res.json({ accessToken });
  } catch (err) {
    return res.status(401).json({ message: "Invalid refresh token" });
  }
};

// ── Get All Users (for starting a chat) ──────────────────────────
export const getUsers = async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } }).select("-password");
    return res.json(users);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};
import { Router } from "express";
import { body } from "express-validator";
import { register, login, refreshToken, getUsers } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

// POST /api/auth/register
router.post(
  "/register",
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("phone").notEmpty().withMessage("Phone is required"),
    body("password").isLength({ min: 6 }).withMessage("Password min 6 chars"),
  ],
  register
);

// POST /api/auth/login
router.post(
  "/login",
  [
    body("phone").notEmpty().withMessage("Phone is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  login
);

// POST /api/auth/refresh-token
router.post("/refresh-token", refreshToken);

// GET /api/auth/users  (protected)
router.get("/users", protect, getUsers);

export default router;
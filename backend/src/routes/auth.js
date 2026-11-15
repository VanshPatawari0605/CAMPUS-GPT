import bcrypt from "bcrypt";
import crypto from "crypto";
import { Router } from "express";
import { body } from "express-validator";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { authenticate } from "../middleware/auth.js";
import { asyncHandler, validate } from "../middleware/common.js";
import { RevokedToken, User } from "../models/index.js";
import { DEPARTMENTS, LANGUAGES } from "../utils/constants.js";

const router = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 50, standardHeaders: true, legacyHeaders: false });

const publicUser = (u) => ({
  id: u._id,
  fullName: u.fullName,
  email: u.email,
  role: u.role,
  studentId: u.studentId,
  department: u.department,
  semester: u.semester,
  preferredLanguage: u.preferredLanguage,
  subjects: u.subjects,
});

const signToken = (user) =>
  jwt.sign({ role: user.role }, env.jwtSecret, {
    subject: String(user._id),
    expiresIn: env.jwtExpiresIn,
    jwtid: crypto.randomUUID(),
  });

router.post(
  "/register",
  limiter,
  [
    body("fullName").trim().isLength({ min: 2, max: 100 }).withMessage("Enter your full name"),
    body("email").isEmail().withMessage("Enter a valid email").normalizeEmail(),
    body("password")
      .isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
      .matches(/[A-Za-z]/).withMessage("Password needs a letter")
      .matches(/\d/).withMessage("Password needs a number"),
    body("studentId").trim().notEmpty().withMessage("Student ID is required"),
    body("department").isIn(DEPARTMENTS).withMessage("Select a valid department"),
    body("semester").isInt({ min: 1, max: 8 }).withMessage("Semester must be 1 to 8").toInt(),
    body("preferredLanguage").optional().isIn(LANGUAGES).withMessage("Unsupported language"),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { fullName, email, password, studentId, department, semester, preferredLanguage } = req.body;
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      fullName, email, passwordHash, studentId, department, semester,
      preferredLanguage: preferredLanguage || "en",
      role: "student", // role is never taken from the request body
    });
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  })
);

async function login(req, res, expectedRole) {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+passwordHash");
  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  // Same response for wrong password and wrong portal to avoid account probing.
  if (!ok || user.role !== expectedRole) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  res.json({ token: signToken(user), user: publicUser(user) });
}

const loginRules = [
  body("email").isEmail().withMessage("Enter a valid email").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

router.post("/login", limiter, loginRules, validate, asyncHandler((req, res) => login(req, res, "student")));
router.post("/admin/login", limiter, loginRules, validate, asyncHandler((req, res) => login(req, res, "admin")));

router.get("/me", authenticate, (req, res) => res.json({ user: publicUser(req.user) }));

router.post(
  "/logout",
  authenticate,
  asyncHandler(async (req, res) => {
    await RevokedToken.updateOne(
      { jti: req.token.jti },
      { jti: req.token.jti, expiresAt: new Date(req.token.exp * 1000) },
      { upsert: true }
    );
    res.json({ message: "Logged out" });
  })
);

export default router;

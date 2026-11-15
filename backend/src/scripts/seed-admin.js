// Creates (or updates the password of) the single controlled admin account.
// Usage: npm run seed:admin   (reads ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD from .env)
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import "../config/env.js";
import { User } from "../models/index.js";

const name = process.env.ADMIN_NAME || "College Admin";
const email = (process.env.ADMIN_EMAIL || "").toLowerCase();
const password = process.env.ADMIN_PASSWORD || "";

if (!email || password.length < 10) {
  console.error("Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 10 characters in .env");
  process.exit(1);
}

await connectDB();
const passwordHash = await bcrypt.hash(password, 12);
const existing = await User.findOne({ email });

if (existing && existing.role !== "admin") {
  console.error("That email belongs to a student account. Use a different ADMIN_EMAIL.");
  process.exit(1);
}

if (existing) {
  existing.passwordHash = passwordHash;
  existing.fullName = name;
  await existing.save();
  console.log(`Updated admin: ${email}`);
} else {
  await User.create({ fullName: name, email, passwordHash, role: "admin" });
  console.log(`Created admin: ${email}`);
}
await mongoose.disconnect();

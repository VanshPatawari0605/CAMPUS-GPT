import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { RevokedToken, User } from "../models/index.js";

export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Authentication required" });

    let payload;
    try {
      payload = jwt.verify(token, env.jwtSecret);
    } catch {
      return res.status(401).json({ message: "Session expired or invalid. Please log in again." });
    }

    if (await RevokedToken.exists({ jti: payload.jti })) {
      return res.status(401).json({ message: "You have been logged out." });
    }

    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ message: "Account no longer exists" });

    req.user = user;
    req.token = payload;
    next();
  } catch (err) {
    next(err);
  }
}

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: "You do not have permission to do this" });
  }
  next();
};

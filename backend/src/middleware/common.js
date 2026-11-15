import { validationResult } from "express-validator";
import mongoose from "mongoose";

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  const first = errors.array()[0];
  res.status(400).json({
    message: first.msg,
    errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
  });
};

export const validObjectId = (param = "id") => (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params[param])) {
    return res.status(400).json({ message: "Invalid id" });
  }
  next();
};

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function notFound(req, res) {
  res.status(404).json({ message: "Route not found" });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ message: "File is too large" });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "value";
    return res.status(409).json({ message: `A record with this ${field} already exists` });
  }
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ message: status >= 500 ? "Something went wrong on the server" : err.message });
}

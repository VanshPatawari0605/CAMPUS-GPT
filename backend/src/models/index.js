import mongoose from "mongoose";
import { DEPARTMENTS, LANGUAGES } from "../utils/constants.js";

const { Schema, model } = mongoose;
const oid = (ref) => ({ type: Schema.Types.ObjectId, ref });

/* ---------- Users (+ student profile fields) ---------- */
const userSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["student", "admin"], default: "student" },
    studentId: { type: String, trim: true, sparse: true, unique: true },
    department: { type: String, enum: DEPARTMENTS },
    semester: { type: Number, min: 1, max: 8 },
    preferredLanguage: { type: String, enum: LANGUAGES, default: "en" },
    subjects: [{ type: String, trim: true }],
  },
  { timestamps: true }
);
export const User = model("User", userSchema);

/* ---------- Revoked JWTs (logout) – TTL cleaned by Mongo ---------- */
const revokedSchema = new Schema({
  jti: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});
export const RevokedToken = model("RevokedToken", revokedSchema);

/* ---------- Document metadata (vectors live in ChromaDB) ---------- */
const documentSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    originalName: String,
    storedName: String,
    fileHash: { type: String, required: true, unique: true },
    size: Number,
    category: { type: String, default: "General" },
    department: { type: String, default: "All" },
    semester: { type: Number, default: 0 }, // 0 = all semesters
    isNotice: { type: Boolean, default: false },
    status: { type: String, enum: ["processing", "ready", "failed"], default: "processing" },
    error: String,
    pages: Number,
    chunks: Number,
    analysisStatus: { type: String, enum: ["none", "running", "done", "failed"], default: "none" },
    analysis: Schema.Types.Mixed, // structured notice JSON
    uploadedBy: oid("User"),
  },
  { timestamps: true }
);
export const Document = model("Document", documentSchema);

/* ---------- Chat ---------- */
const sessionSchema = new Schema(
  {
    user: { ...oid("User"), required: true, index: true },
    title: { type: String, default: "New chat" },
  },
  { timestamps: true }
);
export const ChatSession = model("ChatSession", sessionSchema);

const messageSchema = new Schema(
  {
    session: { ...oid("ChatSession"), required: true, index: true },
    user: { ...oid("User"), required: true },
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    grounded: Boolean,
    sources: [
      {
        documentId: String,
        documentName: String,
        page: Number,
        category: String,
        passage: String,
        score: Number,
      },
    ],
    feedback: { value: { type: String, enum: ["up", "down"] }, comment: String },
  },
  { timestamps: true }
);
export const ChatMessage = model("ChatMessage", messageSchema);

/* ---------- Deadlines (AI-extracted → admin approved) ---------- */
const deadlineSchema = new Schema(
  {
    title: { type: String, required: true },
    description: String,
    date: { type: Date, required: true },
    department: { type: String, default: "All" },
    semester: { type: Number, default: 0 },
    sourceDocument: oid("Document"),
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  },
  { timestamps: true }
);
export const Deadline = model("Deadline", deadlineSchema);

/* ---------- Announcements ---------- */
const announcementSchema = new Schema(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
    priority: { type: String, enum: ["normal", "important"], default: "normal" },
    department: { type: String, default: "All" },
    createdBy: oid("User"),
  },
  { timestamps: true }
);
export const Announcement = model("Announcement", announcementSchema);

/* ---------- Quizzes ---------- */
const quizSchema = new Schema(
  {
    user: { ...oid("User"), required: true, index: true },
    title: String,
    topic: String,
    difficulty: String,
    language: String,
    questions: [
      {
        question: String,
        options: [String],
        correctIndex: Number,
        explanation: String,
        page: Number,
      },
    ],
  },
  { timestamps: true }
);
export const Quiz = model("Quiz", quizSchema);

const attemptSchema = new Schema(
  {
    user: { ...oid("User"), required: true, index: true },
    quiz: { ...oid("Quiz"), required: true },
    answers: [Number],
    score: Number,
    total: Number,
  },
  { timestamps: true }
);
export const QuizAttempt = model("QuizAttempt", attemptSchema);

/* ---------- Analytics: one record per chatbot query ---------- */
const queryLogSchema = new Schema(
  {
    user: oid("User"),
    question: String,
    normalized: { type: String, index: true },
    grounded: Boolean,
    topScore: Number,
    language: String,
    department: String,
    categories: [String],
  },
  { timestamps: true }
);
export const QueryLog = model("QueryLog", queryLogSchema);

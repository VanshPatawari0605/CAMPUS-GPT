import { Router } from "express";
import { body } from "express-validator";
import rateLimit from "express-rate-limit";
import { authenticate } from "../middleware/auth.js";
import { asyncHandler, validate, validObjectId } from "../middleware/common.js";
import { ChatMessage, ChatSession, QueryLog, Document } from "../models/index.js";
import * as rag from "../services/rag.js";
import { LANGUAGES } from "../utils/constants.js";

const router = Router();
router.use(authenticate);

const chatLimiter = rateLimit({ windowMs: 60 * 1000, limit: 20, keyGenerator: (req) => String(req.user._id) });

// Every session lookup is scoped to the logged-in user.
async function ownSession(req, res) {
  const session = await ChatSession.findOne({ _id: req.params.id, user: req.user._id });
  if (!session) res.status(404).json({ message: "Chat not found" });
  return session;
}

router.get(
  "/sessions",
  asyncHandler(async (req, res) => {
    const sessions = await ChatSession.find({ user: req.user._id }).sort({ updatedAt: -1 }).limit(100);
    res.json({ sessions });
  })
);

router.post(
  "/sessions",
  asyncHandler(async (req, res) => {
    const session = await ChatSession.create({ user: req.user._id });
    res.status(201).json({ session });
  })
);

router.patch(
  "/sessions/:id",
  validObjectId(),
  [body("title").trim().isLength({ min: 1, max: 80 }).withMessage("Title must be 1 to 80 characters")],
  validate,
  asyncHandler(async (req, res) => {
    const session = await ownSession(req, res);
    if (!session) return;
    session.title = req.body.title;
    await session.save();
    res.json({ session });
  })
);

router.delete(
  "/sessions/:id",
  validObjectId(),
  asyncHandler(async (req, res) => {
    const session = await ownSession(req, res);
    if (!session) return;
    await ChatMessage.deleteMany({ session: session._id });
    await session.deleteOne();
    res.json({ message: "Chat deleted" });
  })
);

router.get(
  "/sessions/:id/messages",
  validObjectId(),
  asyncHandler(async (req, res) => {
    const session = await ownSession(req, res);
    if (!session) return;
    const messages = await ChatMessage.find({ session: session._id }).sort({ createdAt: 1 });
    res.json({ session, messages });
  })
);

router.post(
  "/sessions/:id/messages",
  chatLimiter,
  validObjectId(),
  [
    body("question").trim().isLength({ min: 1, max: 2000 }).withMessage("Question must be 1 to 2000 characters"),
    body("language").optional().isIn(LANGUAGES),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const session = await ownSession(req, res);
    if (!session) return;

    const { question } = req.body;
    const language = req.body.language || req.user.preferredLanguage || "en";

    const recent = await ChatMessage.find({ session: session._id }).sort({ createdAt: -1 }).limit(6);
    const history = recent.reverse().map((m) => ({ role: m.role, content: m.content }));

    const userMsg = await ChatMessage.create({
      session: session._id, user: req.user._id, role: "user", content: question,
    });

    const eligibleDocuments = await Document.find({
  status: "ready",
  department: { $in: [req.user.department, "All"] },
  semester: { $in: [req.user.semester, 0] },
}).select("_id");

const documentIds = eligibleDocuments.map((doc) => String(doc._id));

const result = await rag.chat({
  question,
  language,
  department: req.user.department,
  semester: req.user.semester,
  history,
  documentIds,
});

    const assistantMsg = await ChatMessage.create({
      session: session._id,
      user: req.user._id,
      role: "assistant",
      content: result.answer,
      grounded: result.grounded,
      sources: result.sources,
    });

    if (session.title === "New chat") session.title = question.slice(0, 60);
    session.updatedAt = new Date();
    await session.save();

    // Analytics record (used for knowledge-gap detection).
    QueryLog.create({
      user: req.user._id,
      question,
      normalized: question.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim(),
      grounded: result.grounded,
      topScore: result.sources?.[0]?.score,
      language,
      department: req.user.department,
      categories: [...new Set((result.sources || []).map((s) => s.category).filter(Boolean))],
    }).catch((e) => console.error("QueryLog failed:", e.message));

    res.status(201).json({ session, userMessage: userMsg, assistantMessage: assistantMsg });
  })
);

router.post(
  "/messages/:id/feedback",
  validObjectId(),
  [
    body("value").isIn(["up", "down"]),
    body("comment").optional().isString().isLength({ max: 500 }),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const msg = await ChatMessage.findOne({ _id: req.params.id, user: req.user._id, role: "assistant" });
    if (!msg) return res.status(404).json({ message: "Message not found" });
    msg.feedback = { value: req.body.value, comment: req.body.comment };
    await msg.save();
    res.json({ message: msg });
  })
);

export default router;

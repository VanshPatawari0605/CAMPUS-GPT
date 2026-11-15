import { Router } from "express";
import { body } from "express-validator";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import { authenticate } from "../middleware/auth.js";
import { asyncHandler, validate, validObjectId } from "../middleware/common.js";
import { Document, Quiz, QuizAttempt } from "../models/index.js";
import * as rag from "../services/rag.js";
import { LANGUAGES } from "../utils/constants.js";

const router = Router();
router.use(authenticate);

const limiter = rateLimit({ windowMs: 60 * 1000, limit: 6, keyGenerator: (req) => String(req.user._id) });

// Answers are hidden until the student submits an attempt.
const hideAnswers = (quiz) => {
  const q = quiz.toObject();
  q.questions = q.questions.map(({ question, options, page, _id }) => ({ _id, question, options, page }));
  return q;
};

router.post(
  "/generate",
  limiter,
  [
    body("topic").optional({ values: "falsy" }).trim().isLength({ max: 200 }),
    body("documentId").optional({ values: "falsy" }).custom((v) => mongoose.isValidObjectId(v)),
    body("numQuestions").optional().isInt({ min: 3, max: 15 }).toInt(),
    body("difficulty").optional().isIn(["easy", "medium", "hard"]),
    body("language").optional().isIn(LANGUAGES),
    body().custom((b) => Boolean(b.topic || b.documentId)).withMessage("Choose a topic or a document"),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { topic, documentId } = req.body;
    const numQuestions = req.body.numQuestions || 5;
    const difficulty = req.body.difficulty || "medium";
    const language = req.body.language || req.user.preferredLanguage || "en";

    let title = topic;
    if (documentId) {
      const doc = await Document.findOne({ _id: documentId, status: "ready" });
      if (!doc) return res.status(404).json({ message: "Document not found" });
      title = title || doc.title;
    }

    const result = await rag.generateQuiz({
      documentIds: documentId ? [documentId] : null,
      topic: topic || null,
      numQuestions,
      difficulty,
      language,
      department: req.user.department,
      semester: req.user.semester,
    });

    const quiz = await Quiz.create({
      user: req.user._id, title: `Quiz: ${title}`, topic: title, difficulty, language, questions: result.questions,
    });
    res.status(201).json({ quiz: hideAnswers(quiz) });
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const quizzes = await Quiz.find({ user: req.user._id }).select("title difficulty language createdAt questions").sort({ createdAt: -1 }).limit(30);
    const attempts = await QuizAttempt.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({
      quizzes: quizzes.map((q) => ({
        _id: q._id, title: q.title, difficulty: q.difficulty, language: q.language,
        createdAt: q.createdAt, questionCount: q.questions.length,
        bestScore: Math.max(-1, ...attempts.filter((a) => String(a.quiz) === String(q._id)).map((a) => a.score)),
      })),
    });
  })
);

router.get(
  "/attempts",
  asyncHandler(async (req, res) => {
    const attempts = await QuizAttempt.find({ user: req.user._id }).populate("quiz", "title").sort({ createdAt: -1 }).limit(30);
    res.json({ attempts });
  })
);

router.get(
  "/:id",
  validObjectId(),
  asyncHandler(async (req, res) => {
    const quiz = await Quiz.findOne({ _id: req.params.id, user: req.user._id });
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    res.json({ quiz: hideAnswers(quiz) });
  })
);

router.post(
  "/:id/attempt",
  validObjectId(),
  [body("answers").isArray({ min: 1, max: 30 }), body("answers.*").isInt({ min: -1, max: 3 }).toInt()],
  validate,
  asyncHandler(async (req, res) => {
    const quiz = await Quiz.findOne({ _id: req.params.id, user: req.user._id });
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    const answers = quiz.questions.map((_, i) => (Number.isInteger(req.body.answers[i]) ? req.body.answers[i] : -1));
    const score = quiz.questions.reduce((s, q, i) => s + (answers[i] === q.correctIndex ? 1 : 0), 0);
    const attempt = await QuizAttempt.create({
      user: req.user._id, quiz: quiz._id, answers, score, total: quiz.questions.length,
    });

    res.status(201).json({
      attempt,
      review: quiz.questions.map((q, i) => ({
        question: q.question, options: q.options, correctIndex: q.correctIndex,
        explanation: q.explanation, page: q.page, yourAnswer: answers[i],
      })),
    });
  })
);

export default router;

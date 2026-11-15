import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/common.js";
import { ChatMessage, ChatSession, Document, QueryLog, User } from "../models/index.js";

const router = Router();
router.use(authenticate, requireRole("admin"));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const [students, documents, sessions, queries, grounded, feedback, perDay, gaps, byCategory, byDepartment, byLanguage, docsByCategory] =
      await Promise.all([
        User.countDocuments({ role: "student" }),
        Document.countDocuments({ status: "ready" }),
        ChatSession.countDocuments(),
        QueryLog.countDocuments(),
        QueryLog.countDocuments({ grounded: true }),
        ChatMessage.aggregate([
          { $match: { "feedback.value": { $exists: true } } },
          { $group: { _id: "$feedback.value", count: { $sum: 1 } } },
        ]),
        QueryLog.aggregate([
          { $match: { createdAt: { $gte: since } } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              total: { $sum: 1 },
              answered: { $sum: { $cond: ["$grounded", 1, 0] } },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        // Knowledge gaps: questions the bot could not answer, grouped by normalised text.
        QueryLog.aggregate([
          { $match: { grounded: false } },
          {
            $group: {
              _id: "$normalized",
              question: { $first: "$question" },
              count: { $sum: 1 },
              lastAsked: { $max: "$createdAt" },
              departments: { $addToSet: "$department" },
            },
          },
          { $sort: { count: -1, lastAsked: -1 } },
          { $limit: 10 },
        ]),
        QueryLog.aggregate([
          { $unwind: "$categories" },
          { $group: { _id: "$categories", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        QueryLog.aggregate([
          { $match: { department: { $ne: null } } },
          { $group: { _id: "$department", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        QueryLog.aggregate([{ $group: { _id: "$language", count: { $sum: 1 } } }]),
        Document.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      ]);

    // Fill missing days so the chart has a continuous x-axis.
    const dayMap = new Map(perDay.map((d) => [d._id, d]));
    const queriesPerDay = [];
    for (let i = 13; i >= 0; i--) {
      const key = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      const d = dayMap.get(key);
      queriesPerDay.push({ date: key, total: d?.total || 0, answered: d?.answered || 0 });
    }

    const fb = Object.fromEntries(feedback.map((f) => [f._id, f.count]));
    res.json({
      totals: {
        students, documents, chats: sessions, queries,
        answerRate: queries ? Math.round((grounded / queries) * 100) : 0,
        thumbsUp: fb.up || 0, thumbsDown: fb.down || 0,
      },
      queriesPerDay,
      knowledgeGaps: gaps.map((g) => ({
        question: g.question, count: g.count, lastAsked: g.lastAsked, departments: g.departments.filter(Boolean),
      })),
      topicsAsked: byCategory.map((c) => ({ name: c._id, value: c.count })),
      byDepartment: byDepartment.map((c) => ({ name: c._id, value: c.count })),
      byLanguage: byLanguage.map((c) => ({ name: c._id || "en", value: c.count })),
      documentsByCategory: docsByCategory.map((c) => ({ name: c._id, value: c.count })),
    });
  })
);

export default router;

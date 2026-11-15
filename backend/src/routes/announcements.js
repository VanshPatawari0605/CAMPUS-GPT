import { Router } from "express";
import { body } from "express-validator";
import { authenticate, requireRole } from "../middleware/auth.js";
import { asyncHandler, validate, validObjectId } from "../middleware/common.js";
import { Announcement } from "../models/index.js";
import { DEPARTMENTS } from "../utils/constants.js";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const filter = req.user.role === "student" ? { department: { $in: [req.user.department, "All"] } } : {};
    const announcements = await Announcement.find(filter).sort({ createdAt: -1 }).limit(20);
    res.json({ announcements });
  })
);

router.post(
  "/",
  requireRole("admin"),
  [
    body("title").trim().isLength({ min: 2, max: 150 }),
    body("body").trim().isLength({ min: 2, max: 2000 }),
    body("priority").optional().isIn(["normal", "important"]),
    body("department").optional().isIn([...DEPARTMENTS, "All"]),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { title, body: text, priority, department } = req.body;
    const announcement = await Announcement.create({ title, body: text, priority, department, createdBy: req.user._id });
    res.status(201).json({ announcement });
  })
);

router.delete(
  "/:id",
  requireRole("admin"),
  validObjectId(),
  asyncHandler(async (req, res) => {
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  })
);

export default router;

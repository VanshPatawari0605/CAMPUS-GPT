import { Router } from "express";
import { body } from "express-validator";
import { authenticate, requireRole } from "../middleware/auth.js";
import { asyncHandler, validate, validObjectId } from "../middleware/common.js";
import { Deadline } from "../models/index.js";
import { DEPARTMENTS } from "../utils/constants.js";

/* Student: approved, upcoming deadlines relevant to their department and semester */
export const studentRouter = Router();
studentRouter.use(authenticate);

studentRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const u = req.user;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const filter = { status: "approved", date: { $gte: startOfToday } };
    if (u.role === "student") {
      filter.department = { $in: [u.department, "All"] };
      filter.semester = { $in: [u.semester, 0] };
    }
    const deadlines = await Deadline.find(filter).populate("sourceDocument", "title").sort({ date: 1 }).limit(50);
    res.json({ deadlines });
  })
);

/* Admin: review AI suggestions, edit, approve, create */
export const adminRouter = Router();
adminRouter.use(authenticate, requireRole("admin"));

const fields = [
  body("title").optional().trim().isLength({ min: 2, max: 200 }),
  body("description").optional().isString().isLength({ max: 1000 }),
  body("date").optional().isISO8601().withMessage("Enter a valid date"),
  body("department").optional().isIn([...DEPARTMENTS, "All"]),
  body("semester").optional().isInt({ min: 0, max: 8 }).toInt(),
];

adminRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const filter = ["pending", "approved", "rejected"].includes(req.query.status) ? { status: req.query.status } : {};
    const deadlines = await Deadline.find(filter).populate("sourceDocument", "title").sort({ date: 1 });
    res.json({ deadlines });
  })
);

adminRouter.post(
  "/",
  [body("title").trim().isLength({ min: 2, max: 200 }), body("date").isISO8601(), ...fields],
  validate,
  asyncHandler(async (req, res) => {
    const deadline = await Deadline.create({ ...req.body, status: "approved" });
    res.status(201).json({ deadline });
  })
);

adminRouter.patch(
  "/:id",
  validObjectId(),
  [...fields, body("status").optional().isIn(["pending", "approved", "rejected"])],
  validate,
  asyncHandler(async (req, res) => {
    const allowed = ["title", "description", "date", "department", "semester", "status"];
    const update = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
    const deadline = await Deadline.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!deadline) return res.status(404).json({ message: "Deadline not found" });
    res.json({ deadline });
  })
);

adminRouter.delete(
  "/:id",
  validObjectId(),
  asyncHandler(async (req, res) => {
    await Deadline.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  })
);

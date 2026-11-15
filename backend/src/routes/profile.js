import { Router } from "express";
import { body } from "express-validator";
import { authenticate } from "../middleware/auth.js";
import { asyncHandler, validate } from "../middleware/common.js";
import { DEPARTMENTS, LANGUAGES } from "../utils/constants.js";

const router = Router();
router.use(authenticate);

router.get("/", (req, res) => {
  const u = req.user;
  res.json({
    user: {
      id: u._id, fullName: u.fullName, email: u.email, role: u.role, studentId: u.studentId,
      department: u.department, semester: u.semester, preferredLanguage: u.preferredLanguage, subjects: u.subjects,
    },
  });
});

router.put(
  "/",
  [
    body("fullName").optional().trim().isLength({ min: 2, max: 100 }),
    body("department").optional().isIn(DEPARTMENTS),
    body("semester").optional().isInt({ min: 1, max: 8 }).toInt(),
    body("preferredLanguage").optional().isIn(LANGUAGES),
    body("subjects").optional().isArray({ max: 20 }),
    body("subjects.*").optional().isString().trim().isLength({ max: 80 }),
  ],
  validate,
  asyncHandler(async (req, res) => {
    // Whitelist: students can never change role, email or student ID here.
    for (const k of ["fullName", "department", "semester", "preferredLanguage", "subjects"]) {
      if (req.body[k] !== undefined) req.user[k] = req.body[k];
    }
    await req.user.save();
    res.json({ user: req.user });
  })
);

export default router;

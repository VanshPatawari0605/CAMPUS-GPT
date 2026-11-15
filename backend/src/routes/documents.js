import crypto from "crypto";
import fs from "fs";
import multer from "multer";
import path from "path";
import { Router } from "express";
import { body, validationResult } from "express-validator";
import { env } from "../config/env.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { asyncHandler, validate, validObjectId } from "../middleware/common.js";
import { Document } from "../models/index.js";
import { processDocument, removeDocument, runAnalysis, UPLOAD_DIR } from "../services/documents.js";
import { DEPARTMENTS, DOC_CATEGORIES } from "../utils/constants.js";

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, _file, cb) => cb(null, `${crypto.randomUUID()}.pdf`),
  }),
  limits: { fileSize: env.maxUploadMb * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype === "application/pdf" && path.extname(file.originalname).toLowerCase() === ".pdf";
    cb(ok ? null : Object.assign(new Error("Only PDF files are allowed"), { status: 400 }), ok);
  },
});

const sha256 = (filePath) =>
  new Promise((resolve, reject) => {
    const h = crypto.createHash("sha256");
    fs.createReadStream(filePath).on("data", (d) => h.update(d)).on("end", () => resolve(h.digest("hex"))).on("error", reject);
  });

const hasPdfMagic = async (filePath) => {
  const fd = await fs.promises.open(filePath, "r");
  const buf = Buffer.alloc(5);
  await fd.read(buf, 0, 5, 0);
  await fd.close();
  return buf.toString() === "%PDF-";
};

/* ================= Student / shared (authenticated) ================= */
export const studentRouter = Router();
studentRouter.use(authenticate);

const projection = "-storedName -fileHash";

studentRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const docs = await Document.find({ status: "ready" }).select(projection).sort({ createdAt: -1 });
    res.json({ documents: docs });
  })
);

studentRouter.get(
  "/notices",
  asyncHandler(async (req, res) => {
    const u = req.user;
    const filter = { status: "ready", isNotice: true };
    if (u.role === "student") {
      filter.department = { $in: [u.department, "All"] };
      filter.semester = { $in: [u.semester, 0] };
    }
    const docs = await Document.find(filter).select(projection).sort({ createdAt: -1 }).limit(20);
    res.json({ notices: docs });
  })
);

// Lets students open the cited PDF (use #page=N on the client).
studentRouter.get(
  "/:id/file",
  validObjectId(),
  asyncHandler(async (req, res) => {
    const doc = await Document.findOne({ _id: req.params.id, status: "ready" });
    if (!doc) return res.status(404).json({ message: "Document not found" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(doc.originalName || "document.pdf")}"`);
    fs.createReadStream(path.join(UPLOAD_DIR, doc.storedName)).pipe(res);
  })
);

/* ================= Admin ================= */
export const adminRouter = Router();
adminRouter.use(authenticate, requireRole("admin"));

adminRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const docs = await Document.find().select("-storedName").sort({ createdAt: -1 });
    res.json({ documents: docs });
  })
);

adminRouter.post(
  "/",
  upload.single("file"),
  [
    body("title").trim().isLength({ min: 2, max: 200 }).withMessage("Title is required"),
    body("category").isIn(DOC_CATEGORIES).withMessage("Invalid category"),
    body("department").optional().isIn([...DEPARTMENTS, "All"]),
    body("semester").optional().isInt({ min: 0, max: 8 }).toInt(),
    body("isNotice").optional().isBoolean().toBoolean(),
  ],
  (req, res, next) => {
    // multer already wrote the file, so remove it on any rejection below.
    req.cleanup = () => req.file && fs.promises.unlink(req.file.path).catch(() => {});
    if (!req.file) return res.status(400).json({ message: "Attach a PDF file" });
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.cleanup();
      return res.status(400).json({ message: errors.array()[0].msg });
    }
    next();
  },
  asyncHandler(async (req, res) => {
    if (!(await hasPdfMagic(req.file.path))) {
      req.cleanup();
      return res.status(400).json({ message: "This file is not a valid PDF" });
    }
    const fileHash = await sha256(req.file.path);
    const duplicate = await Document.findOne({ fileHash });
    if (duplicate) {
      req.cleanup();
      return res.status(409).json({ message: `This file was already uploaded as "${duplicate.title}"` });
    }

    const doc = await Document.create({
      title: req.body.title,
      originalName: req.file.originalname,
      storedName: req.file.filename,
      fileHash,
      size: req.file.size,
      category: req.body.category,
      department: req.body.department || "All",
      semester: req.body.semester || 0,
      isNotice: Boolean(req.body.isNotice),
      uploadedBy: req.user._id,
    });

    // Index in the background; the client polls the list for status.
    processDocument(doc._id).catch((e) => console.error("processDocument:", e));
    res.status(202).json({ document: doc });
  })
);

adminRouter.post(
  "/:id/reindex",
  validObjectId(),
  asyncHandler(async (req, res) => {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document not found" });
    doc.status = "processing";
    doc.error = undefined;
    await doc.save();
    processDocument(doc._id).catch((e) => console.error("reindex:", e));
    res.status(202).json({ document: doc });
  })
);

adminRouter.post(
  "/:id/analyze",
  validObjectId(),
  asyncHandler(async (req, res) => {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document not found" });
    if (doc.status !== "ready") return res.status(409).json({ message: "Document is not indexed yet" });
    doc.isNotice = true;
    await doc.save();
    runAnalysis(doc).catch((e) => console.error("analyze:", e));
    res.status(202).json({ document: doc });
  })
);

adminRouter.delete(
  "/:id",
  validObjectId(),
  asyncHandler(async (req, res) => {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document not found" });
    await removeDocument(doc);
    res.json({ message: "Document deleted" });
  })
);

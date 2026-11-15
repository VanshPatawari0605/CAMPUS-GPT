import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Deadline, Document } from "../models/index.js";
import * as rag from "./rag.js";

export const UPLOAD_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../uploads");

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Run notice analysis, store it, and propose deadlines for admin approval. */
export async function runAnalysis(doc) {
  doc.analysisStatus = "running";
  await doc.save();
  try {
    const analysis = await rag.analyzeNotice(String(doc._id));
    doc.analysis = analysis;
    doc.analysisStatus = "done";

    // Re-analysis replaces earlier *pending* suggestions for this document only.
    await Deadline.deleteMany({ sourceDocument: doc._id, status: "pending" });
    const candidates = [...(analysis.deadlines || [])];
    const proposals = candidates
      .filter((d) => d.title && ISO_DATE.test(d.date || ""))
      .map((d) => ({
        title: String(d.title).slice(0, 200),
        description: String(d.description || "").slice(0, 1000),
        date: new Date(`${d.date}T00:00:00.000Z`),
        department: analysis.targetDepartment || doc.department || "All",
        semester: Number.isInteger(analysis.targetSemester) ? analysis.targetSemester : doc.semester || 0,
        sourceDocument: doc._id,
        status: "pending",
      }));
    if (proposals.length) await Deadline.insertMany(proposals);
  } catch (err) {
    console.error("Notice analysis failed:", err.message);
    doc.analysisStatus = "failed";
  }
  await doc.save();
}

/** Background pipeline: index in the RAG service, then optionally analyse as a notice. */
export async function processDocument(docId) {
  const doc = await Document.findById(docId);
  if (!doc) return;
  const filePath = path.join(UPLOAD_DIR, doc.storedName);
  try {
    const result = await rag.ingestDocument(doc, filePath);
    doc.status = "ready";
    doc.error = undefined;
    doc.pages = result.pages;
    doc.chunks = result.chunks;
    await doc.save();
    if (doc.isNotice) await runAnalysis(doc);
  } catch (err) {
    doc.status = "failed";
    doc.error = err.message;
    await doc.save();
  }
}

export async function removeDocument(doc) {
  try {
    await rag.deleteVectors(String(doc._id));
  } catch (err) {
    console.error("Vector delete failed:", err.message);
  }
  fs.promises.unlink(path.join(UPLOAD_DIR, doc.storedName)).catch(() => {});
  await Deadline.deleteMany({ sourceDocument: doc._id });
  await doc.deleteOne();
}

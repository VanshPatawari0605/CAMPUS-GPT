import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import { env } from "../config/env.js";

const client = axios.create({
  baseURL: env.ragUrl,
  headers: { "X-Internal-Key": env.internalKey },
  timeout: 120000,
});

function unwrap(err) {
  const detail = err.response?.data?.detail;
  const e = new Error(
    typeof detail === "string"
      ? detail
      : err.code === "ECONNREFUSED"
      ? "The AI service is not reachable. Please try again shortly."
      : err.message
  );
  e.status = err.response?.status === 422 || err.response?.status === 404 ? 422 : 502;
  throw e;
}

export async function ingestDocument(doc, filePath) {
  const form = new FormData();
  form.append("file", fs.createReadStream(filePath), { filename: doc.originalName || "doc.pdf" });
  form.append("document_id", String(doc._id));
  form.append("document_name", doc.title);
  form.append("department", doc.department);
  form.append("semester", String(doc.semester));
  form.append("category", doc.category);
  form.append("uploaded_at", doc.createdAt.toISOString());
  try {
    const { data } = await client.post("/documents/ingest", form, {
      headers: form.getHeaders(),
      maxBodyLength: Infinity,
      timeout: 600000,
    });
    return data;
  } catch (err) {
    unwrap(err);
  }
}

export async function deleteVectors(documentId) {
  try {
    await client.delete(`/documents/${documentId}`);
  } catch (err) {
    unwrap(err);
  }
}

export async function chat(payload) {
  try {
    return (await client.post("/chat", payload)).data;
  } catch (err) {
    unwrap(err);
  }
}

export async function analyzeNotice(documentId) {
  try {
    return (await client.post("/notices/analyze", { documentId })).data;
  } catch (err) {
    unwrap(err);
  }
}

export async function generateQuiz(payload) {
  try {
    return (await client.post("/quiz/generate", payload)).data;
  } catch (err) {
    unwrap(err);
  }
}

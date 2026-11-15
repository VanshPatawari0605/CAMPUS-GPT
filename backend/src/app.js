import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler, notFound } from "./middleware/common.js";
import { adminRouter as adminDeadlines, studentRouter as studentDeadlines } from "./routes/deadlines.js";
import { adminRouter as adminDocuments, studentRouter as studentDocuments } from "./routes/documents.js";
import analytics from "./routes/analytics.js";
import announcements from "./routes/announcements.js";
import auth from "./routes/auth.js";
import chat from "./routes/chat.js";
import profile from "./routes/profile.js";
import quizzes from "./routes/quizzes.js";

const app = express();

// Cited PDFs are opened in a new tab from the SPA, so framing/cross-origin policies stay relaxed for them only.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", auth);
app.use("/api/profile", profile);
app.use("/api/chat", chat);
app.use("/api/quizzes", quizzes);
app.use("/api/announcements", announcements);
app.use("/api/deadlines", studentDeadlines);
app.use("/api/documents", studentDocuments);

app.use("/api/admin/documents", adminDocuments);
app.use("/api/admin/deadlines", adminDeadlines);
app.use("/api/admin/analytics", analytics);

app.use(notFound);
app.use(errorHandler);

export default app;

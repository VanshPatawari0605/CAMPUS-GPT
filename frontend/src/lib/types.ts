export type Role = "student" | "admin";
export type Lang = "en" | "hi" | "or";

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  studentId?: string;
  department?: string;
  semester?: number;
  preferredLanguage: Lang;
  subjects?: string[];
}

export interface Source {
  documentId: string;
  documentName: string;
  page: number;
  category?: string;
  passage: string;
  score: number;
}

export interface Message {
  _id: string;
  role: "user" | "assistant";
  content: string;
  grounded?: boolean;
  sources?: Source[];
  feedback?: { value?: "up" | "down" };
  createdAt: string;
}

export interface Session {
  _id: string;
  title: string;
  updatedAt: string;
}

export interface NoticeAnalysis {
  title?: string;
  category?: string;
  summary?: string;
  importantDates?: { label: string; date: string | null; rawText?: string }[];
  deadlines?: { title: string; date: string | null; description?: string }[];
  eligibility?: string[];
  requiredDocuments?: string[];
  instructions?: string[];
  targetDepartment?: string;
  targetSemester?: number | null;
}

export interface DocumentItem {
  _id: string;
  title: string;
  originalName?: string;
  size?: number;
  category: string;
  department: string;
  semester: number;
  isNotice: boolean;
  status: "processing" | "ready" | "failed";
  error?: string;
  pages?: number;
  chunks?: number;
  analysisStatus: "none" | "running" | "done" | "failed";
  analysis?: NoticeAnalysis;
  createdAt: string;
}

export interface Deadline {
  _id: string;
  title: string;
  description?: string;
  date: string;
  department: string;
  semester: number;
  status: "pending" | "approved" | "rejected";
  sourceDocument?: { _id: string; title: string } | null;
}

export interface Announcement {
  _id: string;
  title: string;
  body: string;
  priority: "normal" | "important";
  department: string;
  createdAt: string;
}

export const DEPARTMENTS = ["CSE", "IT", "ECE", "EEE", "ME", "CE", "Other"];
export const DOC_CATEGORIES = [
  "Examination", "Academic", "Placement", "Fees", "Administrative",
  "Scholarship", "Event", "Syllabus", "General",
];

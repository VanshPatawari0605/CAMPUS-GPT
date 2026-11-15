import { MongoMemoryServer } from "mongodb-memory-server";

const mongod = await MongoMemoryServer.create();
process.env.MONGODB_URI = mongod.getUri("campusgpt");
process.env.JWT_SECRET = "test-secret";
process.env.RAG_SERVICE_URL = "http://127.0.0.1:9"; // unreachable on purpose

const { default: app } = await import("../src/app.js");
const { connectDB } = await import("../src/config/db.js");
const { User } = await import("../src/models/index.js");
const bcrypt = (await import("bcrypt")).default;
await connectDB();
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}/api`;

let pass = 0, fail = 0;
const check = (name, cond, extra = "") => { cond ? pass++ : fail++; console.log(cond ? "PASS" : "FAIL", name, cond ? "" : extra); };
const call = async (method, path, body, token, isForm) => {
  const r = await fetch(base + path, {
    method,
    headers: { ...(token && { Authorization: `Bearer ${token}` }), ...(body && !isForm && { "Content-Type": "application/json" }) },
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });
  let j = {}; try { j = await r.json(); } catch {}
  return { s: r.status, j };
};

const stuA = { fullName: "Alice A", email: "a@x.com", password: "Passw0rdA", studentId: "S1", department: "CSE", semester: 6, preferredLanguage: "hi" };
const stuB = { ...stuA, fullName: "Bob B", email: "b@x.com", studentId: "S2" };

let r = await call("POST", "/auth/register", { ...stuA, role: "admin" });
check("register student", r.s === 201 && r.j.user.role === "student", JSON.stringify(r));
const tA = r.j.token;
r = await call("POST", "/auth/register", stuB); const tB = r.j.token;
r = await call("POST", "/auth/register", { ...stuA, password: "short" });
check("weak password rejected", r.s === 400);
r = await call("POST", "/auth/register", stuA);
check("duplicate email rejected", r.s === 409, JSON.stringify(r));

await User.create({ fullName: "Admin", email: "admin@x.com", role: "admin", passwordHash: await bcrypt.hash("AdminPass123", 10) });
r = await call("POST", "/auth/admin/login", { email: "admin@x.com", password: "AdminPass123" });
check("admin login", r.s === 200 && r.j.user.role === "admin"); const tAdmin = r.j.token;
r = await call("POST", "/auth/login", { email: "admin@x.com", password: "AdminPass123" });
check("admin cannot use student login", r.s === 401);
r = await call("POST", "/auth/admin/login", { email: "a@x.com", password: "Passw0rdA" });
check("student cannot use admin login", r.s === 401);

r = await call("GET", "/admin/documents", null, tA);
check("student blocked from admin docs", r.s === 403);
r = await call("GET", "/admin/analytics", null, null);
check("anonymous blocked", r.s === 401);

r = await call("GET", "/admin/analytics", null, tAdmin);
check("admin analytics", r.s === 200 && r.j.queriesPerDay.length === 14, JSON.stringify(r).slice(0, 200));

// Chat ownership
r = await call("POST", "/chat/sessions", null, tA); const sid = r.j.session._id;
r = await call("GET", `/chat/sessions/${sid}/messages`, null, tB);
check("other student cannot read chat", r.s === 404);
r = await call("DELETE", `/chat/sessions/${sid}`, null, tB);
check("other student cannot delete chat", r.s === 404);
r = await call("PATCH", `/chat/sessions/${sid}`, { title: "Renamed" }, tA);
check("rename own chat", r.s === 200 && r.j.session.title === "Renamed");
r = await call("POST", `/chat/sessions/${sid}/messages`, { question: "attendance?" }, tA);
check("chat surfaces RAG outage cleanly (not 500 crash)", r.s === 502, JSON.stringify(r));

// Upload + duplicate detection (RAG down => doc ends up failed, but duplicate must still be caught)
const pdf = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF");
const form = () => { const f = new FormData(); f.append("file", new Blob([pdf], { type: "application/pdf" }), "t.pdf"); f.append("title", "Test Doc"); f.append("category", "Academic"); return f; };
r = await call("POST", "/admin/documents", form(), tAdmin, true);
check("upload accepted", r.s === 202, JSON.stringify(r));
r = await call("POST", "/admin/documents", form(), tAdmin, true);
check("duplicate upload rejected", r.s === 409, JSON.stringify(r));
const bad = new FormData(); bad.append("file", new Blob(["hello"], { type: "text/plain" }), "x.txt"); bad.append("title", "Bad"); bad.append("category", "Academic");
r = await call("POST", "/admin/documents", bad, tAdmin, true);
check("non-PDF rejected", r.s === 400, JSON.stringify(r));
await new Promise((res) => setTimeout(res, 1500));
r = await call("GET", "/admin/documents", null, tAdmin);
check("doc marked failed when RAG unreachable", r.j.documents?.[0]?.status === "failed", JSON.stringify(r.j.documents?.[0]));

// Deadlines
r = await call("POST", "/admin/deadlines", { title: "Exam reg", date: "2030-12-15", department: "CSE", semester: 6 }, tAdmin);
check("admin creates deadline", r.s === 201);
r = await call("GET", "/deadlines", null, tA);
check("matching student sees deadline", r.j.deadlines?.length === 1);
const other = await call("POST", "/auth/register", { ...stuA, email: "c@x.com", studentId: "S3", department: "ECE" });
r = await call("GET", "/deadlines", null, other.j.token);
check("other department does not see it", r.j.deadlines?.length === 0);

// Profile mass-assignment
r = await call("PUT", "/profile", { fullName: "Alice Z", role: "admin", email: "hack@x.com" }, tA);
check("profile ignores role/email", r.s === 200 && r.j.user.role === "student" && r.j.user.email === "a@x.com");

// Quiz validation
r = await call("POST", "/quizzes/generate", {}, tA);
check("quiz needs topic or doc", r.s === 400);

// Logout revokes token
r = await call("POST", "/auth/logout", null, tA);
r = await call("GET", "/auth/me", null, tA);
check("token revoked after logout", r.s === 401);

console.log(`\n${pass} passed, ${fail} failed`);
server.close(); await mongod.stop(); process.exit(fail ? 1 : 0);

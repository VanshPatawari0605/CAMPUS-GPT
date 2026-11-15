import "dotenv/config";

const required = ["MONGODB_URI", "JWT_SECRET"];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

export const env = {
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  ragUrl: process.env.RAG_SERVICE_URL || "http://127.0.0.1:8000",
  internalKey: process.env.INTERNAL_API_KEY || "change-me-shared-secret",
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB || 25),
};

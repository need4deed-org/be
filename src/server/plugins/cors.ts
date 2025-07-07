import cors from "@fastify/cors";

export default cors;

export const corsOptions = {
  origin: (origin, cb) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return cb(null, true);

    // Allow specific origins
    const allowedOrigins = (process.env.CORS_ORIGINS || "")
      .split(",")
      .map((o) => o.trim());

    if (allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: (process.env.CORS_CREDENTIALS || "false") === "true",
};

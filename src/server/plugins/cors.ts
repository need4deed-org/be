import cors from "@fastify/cors";

export default cors;

export const corsOptions = {
  origin: (origin, cb) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return cb(null, true);

    // Allow specific origins
    const allowedOrigins = ["http://vmpub:3000", "http://vmpriv:3000"];

    if (allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

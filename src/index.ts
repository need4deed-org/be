import "./data"; // initialize database connection
import { getFastify } from "./server";

export async function start() {
  try {
    const server = await getFastify();
    const port = Number(process.env.PORT) || 5000;
    await server.listen({ port, host: "0.0.0.0" });
    // eslint-disable-next-line no-console
    console.log("Server started.");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

start();

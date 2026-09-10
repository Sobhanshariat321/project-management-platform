import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { prisma } from "./lib/prisma.js";

async function main() {
  // Fail-fast env already validated on import.
  // Verify DB connectivity before listening so errors surface immediately.
  try {
    await prisma.$connect();
    console.log("[server] DB connected");
  } catch (err) {
    console.error("[server] DB connection failed — is Postgres running? `docker compose up -d`", err);
    // In dev, still start so /api/health is reachable; comment out to hard-fail:
    // process.exit(1);
  }

  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`[server] listening on http://localhost:${env.PORT} (env=${env.NODE_ENV})`);
  });
}

main().catch((err) => {
  console.error("[server] fatal", err);
  process.exit(1);
});

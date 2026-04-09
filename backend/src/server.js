const { env } = require("./config/env");
const { connectDB } = require("./config/db");
const { app } = require("./app");

async function bootstrap() {
  await connectDB();
  app.listen(env.PORT, () => {
    console.log(`API listening on port ${env.PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});

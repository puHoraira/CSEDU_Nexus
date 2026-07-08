const { env } = require("./config/env");
const { connectDB } = require("./config/db");
const { app } = require("./app");

const { EmailService } = require("./services/EmailService");
const { SchedulerService } = require("./services/SchedulerService");

async function bootstrap() {
  await connectDB();
  
  // Initialize email service
  try {
    await EmailService.initialize();
    console.log("✓ Email service initialized");
  } catch (error) {
    console.warn("⚠ Email service initialization failed:", error.message);
    console.warn("  Emails will not be sent. Check SMTP configuration.");
  }
  
  // Start scheduler for auto-closing registrations
  SchedulerService.startScheduler();
  
  app.listen(env.PORT, () => {
    console.log(`API listening on port ${env.PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});

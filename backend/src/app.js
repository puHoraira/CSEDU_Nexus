const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");

const { env } = require("./config/env");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");
const { requestAuditMiddleware } = require("./middleware/requestAudit");
const { apiRouter } = require("./routes");

const app = express();

app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
  })
);
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());
app.use(requestAuditMiddleware);

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true, service: "csedu-nexus-api" });
});

app.use("/api/v1", apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = { app };

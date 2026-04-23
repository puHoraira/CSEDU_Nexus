const express = require("express");
const { authRoutes } = require("./authRoutes");
const { governanceRoutes } = require("./governanceRoutes");
const { eventRoutes } = require("./eventRoutes");
const { financeRoutes } = require("./financeRoutes");
const { membershipRoutes } = require("./membershipRoutes");
const { meetingRoutes } = require("./meetingRoutes");
const { electionRoutes } = require("./electionRoutes");
const { moderatorRoutes } = require("./moderatorRoutes");
const { adminRoutes } = require("./adminRoutes");
const { certificateRoutes } = require("./certificateRoutes");
const { notificationRoutes } = require("./notificationRoutes");

const apiRouter = express.Router();

apiRouter.use("/auth", authRoutes);
apiRouter.use("/governance", governanceRoutes);
apiRouter.use("/events", eventRoutes);
apiRouter.use("/finance", financeRoutes);
apiRouter.use("/membership", membershipRoutes);
apiRouter.use("/meetings", meetingRoutes);
apiRouter.use("/elections", electionRoutes);
apiRouter.use("/moderator", moderatorRoutes);
apiRouter.use("/admin", adminRoutes);
apiRouter.use("/certificates", certificateRoutes);
apiRouter.use("/notifications", notificationRoutes);

module.exports = { apiRouter };

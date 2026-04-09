const express = require("express");
const { ModeratorController } = require("../controllers/ModeratorController");
const { authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/authorize");
const { validate } = require("../middleware/validate");
const { z } = require("zod");

const router = express.Router();
const assignCommissionerSchema = z.object({ userId: z.string().min(10) });
const bulkRegisterSchema = z.object({ csvContent: z.string().min(20) });

router.get("/details", authenticate, authorize("governance.proposal.approve"), ModeratorController.details);
router.get(
	"/election-commissioners",
	authenticate,
	authorize("election.commission.manage"),
	ModeratorController.listElectionCommissioners
);
router.post(
	"/election-commissioners",
	authenticate,
	authorize("election.commission.manage"),
	validate(assignCommissionerSchema),
	ModeratorController.assignElectionCommissioner
);
router.delete(
	"/election-commissioners/:userId",
	authenticate,
	authorize("election.commission.manage"),
	ModeratorController.revokeElectionCommissioner
);
router.post(
	"/bulk-register-csv",
	authenticate,
	authorize("governance.proposal.approve"),
	validate(bulkRegisterSchema),
	ModeratorController.bulkRegisterFromCsv
);

module.exports = { moderatorRoutes: router };
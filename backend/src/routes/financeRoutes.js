const express = require("express");
const { FinanceController } = require("../controllers/FinanceController");
const { authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/authorize");
const { validate } = require("../middleware/validate");
const {
  addTransactionSchema,
  signChequeSchema,
  ledgerQuerySchema,
  summaryQuerySchema,
} = require("../validators/financeValidators");

const router = express.Router();

router.post(
  "/transactions",
  authenticate,
  authorize("finance.transaction.create"),
  validate(addTransactionSchema),
  FinanceController.addTransaction
);
router.patch(
  "/transactions/:id/sign-cheque",
  authenticate,
  authorize("finance.cheque.sign"),
  validate(signChequeSchema),
  FinanceController.signCheque
);
router.get(
  "/ledger",
  authenticate,
  authorize("finance.ledger.read"),
  validate(ledgerQuerySchema, "query"),
  FinanceController.ledger
);
router.get(
  "/summary",
  authenticate,
  authorize("finance.ledger.read"),
  validate(summaryQuerySchema, "query"),
  FinanceController.summary
);
router.get("/categories", authenticate, authorize("finance.ledger.read"), FinanceController.categories);
router.get("/pending-cheques", authenticate, authorize("finance.cheque.sign"), FinanceController.pendingCheques);

module.exports = { financeRoutes: router };

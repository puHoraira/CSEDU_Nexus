const { ApiResponse } = require("../core/ApiResponse");
const { asyncHandler } = require("../core/asyncHandler");
const { FinanceService } = require("../services/FinanceService");

class FinanceController {
  static addTransaction = asyncHandler(async (req, res) => {
    const payload = {
      ...req.body,
      occurredOn: req.body.occurredOn ? new Date(req.body.occurredOn) : new Date(),
    };
    const row = await FinanceService.addTransaction(payload, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.created(res, row, "Transaction added");
  });

  static signCheque = asyncHandler(async (req, res) => {
    const row = await FinanceService.signCheque(
      req.params.id,
      req.auth.userId,
      req.body.note,
      req.requestMeta.requestId
    );
    return ApiResponse.ok(res, row, "Cheque signed");
  });

  static ledger = asyncHandler(async (_req, res) => {
    const data = await FinanceService.getLedger();
    return ApiResponse.ok(res, data, "Ledger");
  });
}

module.exports = { FinanceController };

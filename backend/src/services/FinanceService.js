const { Transaction } = require("../models/Transaction");
const { ApiError } = require("../core/ApiError");
const { AuditService } = require("./AuditService");

class FinanceService {
  static async addTransaction(payload, userId, requestId) {
    const row = await Transaction.create({ ...payload, createdBy: userId });
    await AuditService.log({
      actorId: userId,
      action: "FINANCE_TRANSACTION_ADDED",
      resource: "Transaction",
      resourceId: row._id.toString(),
      requestId,
      metadata: { requiresCheque: row.requiresCheque },
    });
    return row;
  }

  static async signCheque(transactionId, actorId, note, requestId) {
    const row = await Transaction.findById(transactionId);
    if (!row) throw new ApiError(404, "Transaction not found");
    if (!row.requiresCheque) throw new ApiError(400, "This transaction does not require cheque signing");
    if (row.chequeSignedAt) throw new ApiError(409, "Cheque already signed");

    row.chequeSignedBy = actorId;
    row.chequeSignedAt = new Date();
    await row.save();

    await AuditService.log({
      actorId,
      action: "FINANCE_CHEQUE_SIGNED",
      resource: "Transaction",
      resourceId: row._id.toString(),
      requestId,
      metadata: { note: note || "" },
    });

    return row;
  }

  static async getLedger() {
    const rows = await Transaction.find({}).sort({ occurredOn: 1, createdAt: 1 });
    const totals = rows.reduce(
      (acc, row) => {
        if (row.type === "Income") acc.income += row.amount;
        if (row.type === "Expenditure") acc.expenditure += row.amount;
        return acc;
      },
      { income: 0, expenditure: 0 }
    );

    return {
      rows,
      totals,
      balance: totals.income - totals.expenditure,
    };
  }
}

module.exports = { FinanceService };

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

  static async getLedger(filters = {}) {
    const query = {};
    const conditions = [];

    if (filters.type) {
      conditions.push({ type: filters.type });
    }
    if (filters.category) {
      conditions.push({ category: filters.category });
    }
    if (filters.startDate) {
      conditions.push({ occurredOn: { $gte: new Date(filters.startDate) } });
    }
    if (filters.endDate) {
      conditions.push({ occurredOn: { $lte: new Date(filters.endDate) } });
    }
    if (filters.search) {
      conditions.push({
        $or: [
          { reference: { $regex: filters.search, $options: "i" } },
          { category: { $regex: filters.search, $options: "i" } },
        ],
      });
    }

    if (conditions.length > 0) {
      query.$and = conditions;
    }

    const rows = await Transaction.find(query)
      .sort({ occurredOn: -1, createdAt: -1 })
      .populate("createdBy", "firstName lastName")
      .populate("chequeSignedBy", "firstName lastName");

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

  static async getSummary(startDate, endDate) {
    const match = {};
    if (startDate || endDate) {
      match.occurredOn = {};
      if (startDate) match.occurredOn.$gte = new Date(startDate);
      if (endDate) match.occurredOn.$lte = new Date(endDate);
    }

    const pipeline = [
      ...(Object.keys(match).length > 0 ? [{ $match: match }] : []),
      { $sort: { occurredOn: 1 } },
    ];

    const rows = await Transaction.aggregate([
      ...pipeline,
      {
        $group: {
          _id: {
            month: { $dateToString: { format: "%Y-%m", date: "$occurredOn" } },
            type: "$type",
          },
          total: { $sum: "$amount" },
        },
      },
    ]);

    const categoryRows = await Transaction.aggregate([
      ...pipeline,
      {
        $group: {
          _id: { category: "$category", type: "$type" },
          total: { $sum: "$amount" },
        },
      },
    ]);

    const allRows = await Transaction.find(Object.keys(match).length > 0 ? match : {}).sort({ occurredOn: 1 });

    const monthlyMap = {};
    for (const row of rows) {
      const month = row._id.month;
      if (!monthlyMap[month]) monthlyMap[month] = { month, income: 0, expenditure: 0 };
      if (row._id.type === "Income") monthlyMap[month].income = row.total;
      if (row._id.type === "Expenditure") monthlyMap[month].expenditure = row.total;
    }
    const monthly = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));

    const categoryMap = {};
    for (const row of categoryRows) {
      const cat = row._id.category;
      if (!categoryMap[cat]) categoryMap[cat] = { category: cat, income: 0, expenditure: 0 };
      if (row._id.type === "Income") categoryMap[cat].income = row.total;
      if (row._id.type === "Expenditure") categoryMap[cat].expenditure = row.total;
    }
    const byCategory = Object.values(categoryMap).sort((a, b) => (b.income + b.expenditure) - (a.income + a.expenditure));

    let runningBalance = 0;
    const balancePoints = [];
    for (const row of allRows) {
      if (row.type === "Income") runningBalance += row.amount;
      if (row.type === "Expenditure") runningBalance -= row.amount;
      balancePoints.push({
        date: row.occurredOn.toISOString().split("T")[0],
        balance: runningBalance,
      });
    }

    const overall = allRows.reduce(
      (acc, row) => {
        if (row.type === "Income") acc.income += row.amount;
        if (row.type === "Expenditure") acc.expenditure += row.amount;
        return acc;
      },
      { income: 0, expenditure: 0 }
    );
    overall.balance = overall.income - overall.expenditure;

    return { monthly, byCategory, runningBalance: balancePoints, overall };
  }

  static async getCategories() {
    const categories = await Transaction.distinct("category");
    return categories.sort();
  }

  static async getPendingCheques() {
    return Transaction.find({ requiresCheque: true, chequeSignedAt: null })
      .sort({ occurredOn: -1 })
      .populate("createdBy", "firstName lastName");
  }
}

module.exports = { FinanceService };

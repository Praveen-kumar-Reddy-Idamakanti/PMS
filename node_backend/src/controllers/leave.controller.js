// controllers/leave.controller.js
//
// Expected model APIs (implement in /models):
// LeaveType.getAll(), LeaveType.getById(id), LeaveType.create(payload),
// LeaveType.update(id, payload), LeaveType.delete(id)
// LeaveBalance.get(userId, typeId, year), LeaveBalance.getAllByUser(userId, year),
// LeaveBalance.getAll(year), LeaveBalance.upsert(userId, typeId, year, balance)
// LeaveRequest.create(payload), LeaveRequest.getById(id), LeaveRequest.getAll(filters),
// LeaveRequest.updateStatus(id, status, meta), LeaveRequest.cancel(id, userId)
//
// All model functions should be async and throw on DB errors.
// Controllers assume req.user is set by auth middleware.

const LeaveType = require("../models/leaves/LeaveType");
const LeaveBalance = require("../models/leaves/LeaveBalance");
const LeaveRequest = require("../models/leaves/leaveRequest");
const db = require("../config/db"); // optional if you need transactions

// Utility
const parseIntSafe = (v, fallback = 0) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
};

exports.getLeaveTypes = async (req, res) => {
  try {
    const types = await LeaveType.getAll();
    return res.json({ success: true, data: types });
  } catch (err) {
    console.error("getLeaveTypes:", err);
    return res.status(500).json({ success: false, error: err.message || "Server error" });
  }
};

exports.createLeaveType = async (req, res) => {
  // ADMIN only — ensure route uses admin middleware
  try {
    const { name, yearly_quota = 0, monthly_quota = 0, carry_forward_allowed = false, carry_forward_limit = 0 } = req.body;
    if (!name) return res.status(400).json({ success: false, error: "Name is required" });

    const payload = {
      name,
      yearly_quota: Number(yearly_quota) || 0,
      monthly_quota: Number(monthly_quota) || 0,
      carry_forward_allowed: !!carry_forward_allowed,
      carry_forward_limit: Number(carry_forward_limit) || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const newType = await LeaveType.create(payload);
    return res.status(201).json({ success: true, data: newType });
  } catch (err) {
    console.error("createLeaveType:", err);
    return res.status(500).json({ success: false, error: err.message || "Server error" });
  }
};

exports.updateLeaveType = async (req, res) => {
  try {
    const { id } = req.params;
    const update = { ...req.body, updated_at: new Date().toISOString() };
    const updated = await LeaveType.update(id, update);
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error("updateLeaveType:", err);
    return res.status(500).json({ success: false, error: err.message || "Server error" });
  }
};

exports.deleteLeaveType = async (req, res) => {
  try {
    const { id } = req.params;
    await LeaveType.delete(id);
    return res.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error("deleteLeaveType:", err);
    return res.status(500).json({ success: false, error: err.message || "Server error" });
  }
};

exports.getUserLeaveBalance = async (req, res) => {
  try {
    // userId param optional; default to logged in user
    const userId = req.params.userId || (req.user && req.user.id);
    if (!userId) return res.status(400).json({ success: false, error: "userId required" });

    const year = parseIntSafe(req.query.year, new Date().getFullYear());
    const balances = await LeaveBalance.getAllByUser(userId, year);
    return res.json({ success: true, data: { year, balances } });
  } catch (err) {
    console.error("getUserLeaveBalance:", err);
    return res.status(500).json({ success: false, error: err.message || "Server error" });
  }
};

exports.getAllBalances = async (req, res) => {
  try {
    const year = parseIntSafe(req.query.year, new Date().getFullYear());
    const rows = await LeaveBalance.getAll(year);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error("getAllBalances:", err);
    return res.status(500).json({ success: false, error: err.message || "Server error" });
  }
};

exports.requestLeave = async (req, res) => {
  /**
   * body: { typeId, startDate, endDate, reason, days }
   * validation and business rules:
   * - check type exists
   * - check overlapping requests
   * - for some leaves you may aut0-approve (not implemented)
   * - default status: pending
   */
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ success: false, error: "Unauthorized" });

    const { typeId, startDate, endDate, reason = "", days } = req.body;
    if (!typeId || !startDate || !endDate) {
      return res.status(400).json({ success: false, error: "typeId, startDate and endDate required" });
    }

    // Basic date validation (ISO yyyy-mm-dd expected)
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) {
      return res.status(400).json({ success: false, error: "Invalid dates" });
    }

    // Optionally compute days if not provided
    const requestedDays = days ? Number(days) : Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1;

    // Check overlapping leave requests
    const overlapping = await LeaveRequest.getOverlapping(userId, startDate, endDate);
    if (overlapping && overlapping.length) {
      return res.status(409).json({ success: false, error: "Overlapping leave request exists" });
    }

    const payload = {
      user_id: userId,
      type_id: typeId,
      start_date: startDate,
      end_date: endDate,
      days: requestedDays,
      reason,
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const created = await LeaveRequest.create(payload);

    // Optionally: if leave type is auto-approve you can call approve flow here.

    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    console.error("requestLeave:", err);
    return res.status(500).json({ success: false, error: err.message || "Server error" });
  }
};

exports.getLeaveRequests = async (req, res) => {
  try {
    const { userId, status, startDate, endDate, limit = 50, offset = 0 } = req.query;
    const filters = {
      userId: userId || undefined,
      status: status || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      limit: parseIntSafe(limit, 50),
      offset: parseIntSafe(offset, 0),
    };

    const rows = await LeaveRequest.getAll(filters);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error("getLeaveRequests:", err);
    return res.status(500).json({ success: false, error: err.message || "Server error" });
  }
};

exports.getLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await LeaveRequest.getById(id);
    if (!row) return res.status(404).json({ success: false, error: "Not found" });
    return res.json({ success: true, data: row });
  } catch (err) {
    console.error("getLeaveRequest:", err);
    return res.status(500).json({ success: false, error: err.message || "Server error" });
  }
};

exports.approveLeave = async (req, res) => {
  // Admin only. Approves a pending leave request and adjusts balances (transactional).
  try {
    const approverId = req.user && req.user.id;
    const { id } = req.params;
    const request = await LeaveRequest.getById(id);
    if (!request) return res.status(404).json({ success: false, error: "Not found" });
    if (request.status !== "pending") return res.status(400).json({ success: false, error: "Only pending requests can be approved" });

    // Load leave type and balance
    const typeId = request.type_id;
    const userId = request.user_id;
    const year = new Date(request.start_date).getFullYear();

    // Start a DB transaction if your model supports it
    // Here we assume model methods are atomic or use db transaction wrapper. Example using db.serialize/db.run not shown.

    // get current balance row
    const lb = await LeaveBalance.get(userId, typeId, year);
    const currentBalance = (lb && lb.balance) || 0;
    const required = request.days || 0;

    if (required > currentBalance) {
      // Not enough balance
      return res.status(400).json({ success: false, error: "Insufficient leave balance" });
    }

    // Deduct
    const newBalance = currentBalance - required;
    await LeaveBalance.upsert(userId, typeId, year, newBalance);

    // Update request
    const meta = {
      approved_by: approverId,
      approved_at: new Date().toISOString(),
    };
    await LeaveRequest.updateStatus(id, "approved", meta);

    return res.json({ success: true, message: "Leave approved" });
  } catch (err) {
    console.error("approveLeave:", err);
    return res.status(500).json({ success: false, error: err.message || "Server error" });
  }
};

exports.rejectLeave = async (req, res) => {
  try {
    const approverId = req.user && req.user.id;
    const { id } = req.params;
    const { reason } = req.body;
    const reqRow = await LeaveRequest.getById(id);
    if (!reqRow) return res.status(404).json({ success: false, error: "Not found" });
    if (reqRow.status !== "pending") return res.status(400).json({ success: false, error: "Only pending requests can be rejected" });

    const meta = {
      rejected_by: approverId,
      rejected_at: new Date().toISOString(),
      reject_reason: reason || null,
    };
    await LeaveRequest.updateStatus(id, "rejected", meta);
    return res.json({ success: true, message: "Leave rejected" });
  } catch (err) {
    console.error("rejectLeave:", err);
    return res.status(500).json({ success: false, error: err.message || "Server error" });
  }
};

exports.cancelLeave = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    const { id } = req.params;
    const reqRow = await LeaveRequest.getById(id);
    if (!reqRow) return res.status(404).json({ success: false, error: "Not found" });
    if (reqRow.user_id !== userId) return res.status(403).json({ success: false, error: "Forbidden" });
    if (reqRow.status !== "pending") return res.status(400).json({ success: false, error: "Only pending requests can be cancelled" });

    await LeaveRequest.updateStatus(id, "cancelled", { cancelled_at: new Date().toISOString() });
    return res.json({ success: true, message: "Cancelled" });
  } catch (err) {
    console.error("cancelLeave:", err);
    return res.status(500).json({ success: false, error: err.message || "Server error" });
  }
};

// Optional admin endpoints to run accruals (could also be in jobs/)
exports.runMonthlyAccruals = async (req, res) => {
  try {
    // This function expects LeaveType.getAll() and LeaveBalance.upsert to exist.
    const types = await LeaveType.getAll();
    const monthlyTypes = types.filter((t) => (t.monthly_quota || 0) > 0);
    if (!monthlyTypes.length) return res.json({ success: true, message: "No monthly accrual types" });

    const users = await db.allAsync("SELECT id FROM users WHERE is_active = 1"); // models might instead expose User.getAllActive
    const year = new Date().getFullYear();

    for (const u of users) {
      for (const t of monthlyTypes) {
        const lb = await LeaveBalance.get(u.id, t.id, year);
        const current = (lb && lb.balance) || 0;
        const next = current + (t.monthly_quota || 0);
        await LeaveBalance.upsert(u.id, t.id, year, next);
      }
    }

    return res.json({ success: true, message: "Monthly accruals completed" });
  } catch (err) {
    console.error("runMonthlyAccruals:", err);
    return res.status(500).json({ success: false, error: err.message || "Server error" });
  }
};

exports.runYearlyInitAndCarryForward = async (req, res) => {
  try {
    const types = await LeaveType.getAll();
    const users = await db.allAsync("SELECT id FROM users WHERE is_active = 1");
    const year = new Date().getFullYear();

    for (const u of users) {
      for (const t of types) {
        if ((t.yearly_quota || 0) > 0) {
          // previous balance
          const prev = await LeaveBalance.get(u.id, t.id, year - 1);
          let carry = 0;
          if (t.carry_forward_allowed && prev) {
            carry = Math.min(prev.balance || 0, t.carry_forward_limit || 0);
          }
          const initial = carry + (t.yearly_quota || 0);
          await LeaveBalance.upsert(u.id, t.id, year, initial);
        }
      }
    }

    return res.json({ success: true, message: "Yearly init & carry forward complete" });
  } catch (err) {
    console.error("runYearlyInitAndCarryForward:", err);
    return res.status(500).json({ success: false, error: err.message || "Server error" });
  } 
};

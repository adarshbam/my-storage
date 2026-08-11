import { getInvoicesLogic } from "../services/billing.service.js";

export const getInvoices = async (req, res, next) => {
  try {
    const result = await getInvoicesLogic({ userId: req.user.id });
    return res.json(result);
  } catch (err) {
    console.error("[getInvoices] Error:", err.message);
    next(err);
  }
};

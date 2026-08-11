import { getSystemConfigLogic, updateSystemConfigLogic, getSystemConfigHelper as getHelper } from "../services/systemConfig.service.js";

// Re-export for backwards compatibility if needed, though we will update usages
export const getSystemConfigHelper = getHelper;

// GET /system-config
export const getSystemConfig = async (req, res, next) => {
  try {
    const result = await getSystemConfigLogic();
    res.status(200).json(result);
  } catch (err) {
    console.error("Error getting system config:", err);
    res.status(500).json({ error: "Failed to load system settings" });
  }
};

// PATCH /system-config
export const updateSystemConfig = async (req, res, next) => {
  try {
    const result = await updateSystemConfigLogic({
      maxDevicesLimit: req.body.maxDevicesLimit,
      maxFileSizeLimit: req.body.maxFileSizeLimit,
      userRole: req.user?.role
    });
    res.status(200).json(result);
  } catch (err) {
    console.error("Error updating system config:", err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Failed to update system settings" });
  }
};

import SystemConfig from "../models/systemConfigModel.js";

export const parseFileSizeToBytes = (val, unit) => {
  const num = Number(val);
  if (!num || isNaN(num)) return 500 * 1024 * 1024;
  const u = (unit || "MB").toUpperCase();
  const multipliers = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
    TB: 1024 * 1024 * 1024 * 1024,
  };
  return num * (multipliers[u] || 1024 * 1024);
};

// Helper to get configuration, ensuring a document always exists
export const getSystemConfigHelper = async () => {
  let config = await SystemConfig.findOne({ key: "global" });
  if (!config) {
    config = await SystemConfig.create({
      key: "global",
      maxDevicesLimit: 3,
      maxFileSizeValue: 500,
      maxFileSizeUnit: "MB",
      maxFileSizeLimit: 500 * 1024 * 1024,
    });
  } else if (!config.maxFileSizeLimit) {
    const computed = parseFileSizeToBytes(config.maxFileSizeValue, config.maxFileSizeUnit);
    config.maxFileSizeLimit = computed;
    await SystemConfig.updateOne(
      { _id: config._id },
      { $set: { maxFileSizeLimit: computed } },
    );
  }
  return config;
};

export const getSystemConfigLogic = async () => {
  const config = await getSystemConfigHelper();
  const configObj = config.toObject ? config.toObject() : { ...config };
  if (!configObj.maxFileSizeLimit) {
    configObj.maxFileSizeLimit = parseFileSizeToBytes(
      configObj.maxFileSizeValue,
      configObj.maxFileSizeUnit,
    );
  }
  return configObj;
};

export const updateSystemConfigLogic = async ({ maxDevicesLimit, maxFileSizeLimit, userRole }) => {
  if (!userRole || userRole.toLowerCase() !== "owner") {
    throw Object.assign(new Error("Access denied. Only Owners can update system configuration."), { status: 403 });
  }

  const updateData = {};

  if (maxDevicesLimit !== undefined) {
    const parsedDevices = parseInt(maxDevicesLimit, 10);
    if (isNaN(parsedDevices) || parsedDevices < 1) {
      throw Object.assign(new Error("Invalid devices limit value."), { status: 400 });
    }
    updateData.maxDevicesLimit = parsedDevices;
  }

  if (maxFileSizeLimit !== undefined) {
    const parsedFileSize = parseInt(maxFileSizeLimit, 10);
    if (isNaN(parsedFileSize) || parsedFileSize < 1) {
      throw Object.assign(new Error("Invalid file size limit value."), { status: 400 });
    }
    updateData.maxFileSizeLimit = parsedFileSize;
  }

  const config = await SystemConfig.findOneAndUpdate(
    { key: "global" },
    { $set: updateData },
    { returnDocument: "after", upsert: true },
  );

  return { message: "Settings updated successfully", config };
};

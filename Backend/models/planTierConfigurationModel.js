import mongoose from "mongoose";

const planTierConfigurationSchema = new mongoose.Schema(
  {
    tier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlanTier",
      required: true,
      unique: true,
    },

    features: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Feature",
      },
    ],

    rules: {
      allowUpload: {
        type: Boolean,
        default: true,
      },

      allowDownload: {
        type: Boolean,
        default: true,
      },

      allowSharing: {
        type: Boolean,
        default: true,
      },

      maxConnectedDevices: {
        type: Number,
        default: 3,
      },

      maxUploadFileSize: {
        type: Number,
        default: 0,
      },

      uploadSpeedMultiplier: {
        type: Number,
        default: 1,
      },

      versionHistoryDays: {
        type: Number,
        default: 30,
      },

      deleteFilesAfterExpiryDays: {
        type: Number,
        default: 30,
      },
    },
  },
  {
    timestamps: true,
  },
);

const PlanTierConfiguration = mongoose.model(
  "PlanTierConfiguration",
  planTierConfigurationSchema,
);

export default PlanTierConfiguration;

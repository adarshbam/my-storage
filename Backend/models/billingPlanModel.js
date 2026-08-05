import mongoose from "mongoose";

const billingPlanSchema = new mongoose.Schema(
  {
    tier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlanTier",
      required: true,
    },

    slug: {
      type: String,
      required: true,
    },

    period: {
      type: String,
      enum: ["Monthly", "Yearly"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "INR",
    },

    storage: {
      type: Number,
      required: true,
    },

    razorpayPlanId: {
      type: String,
      required: true,
    },

    version: {
      type: Number,
      default: 1,
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

const BillingPlan = mongoose.model("BillingPlan", billingPlanSchema);

export default BillingPlan;

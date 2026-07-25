import mongoose from "mongoose";
import { model } from "mongoose";

const PlanSchema = new mongoose.Schema(
  {
    razorpayPlanId: {
      type: String,
      required: true,
      unique: true,
    },

    type: {
      type: String,
      enum: ["Novice", "Professional", "Ultimate"],
      default: "Novice",
    },

    storage: {
      type: Number,
      required: true,
    },

    active: {
      type: Boolean,
      default: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    version: {
      type: Number,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    strict: "throw",
    timestamps: true,
  },
);

const Plan = model("Plan", PlanSchema);
export default Plan;

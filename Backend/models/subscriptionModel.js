import mongoose from "mongoose";
import { model } from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    billingPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BillingPlan",
      default: null,
    },

    razorpaySubscriptionId: {
      type: String,
      required: true,
      unique: true,
    },

    status: {
      type: String,
      enum: [
        "created",
        "authenticated",
        "active",
        "pending",
        "halted",
        "cancelled",
        "completed",
        "expired",
      ],
      default: "created",
    },

    amount: {
      type: Number,
    },

    isFreeTrial: {
      type: Boolean,
      default: false,
    },
  },
  {
    strict: "throw",
    timestamps: true,
  },
);

const Subscription = model("Subscription", subscriptionSchema);
export default Subscription;

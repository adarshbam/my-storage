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

    category: {
      type: String,
      enum: ["ai", "storage"],
      default: "storage",
      required: true,
    },

    status: {
      type: String,
      enum: [
        "created",
        "authenticated",
        "active",
        "pending",
        "paused",
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

    currency: {
      type: String,
      default: "INR",
    },

    isFreeTrial: {
      type: Boolean,
      default: false,
    },

    // ── Lifecycle Dates ──
    purchasedAt: {
      type: Date,
      default: null,
    },
    activatedAt: {
      type: Date,
      default: null,
    },
    pausedAt: {
      type: Date,
      default: null,
    },
    resumedAt: {
      type: Date,
      default: null,
    },
    haltedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    expiredAt: {
      type: Date,
      default: null,
    },

    // ── Billing Cycle Period Fields ──
    currentStart: {
      type: Date,
      default: null,
    },
    currentEnd: {
      type: Date,
      default: null,
    },
    currentPeriodStart: {
      type: Date,
      default: null,
    },
    currentPeriodEnd: {
      type: Date,
      default: null,
    },
    chargeAt: {
      type: Date,
      default: null,
    },
    totalCount: {
      type: Number,
      default: null,
    },
    paidCount: {
      type: Number,
      default: 0,
    },
    remainingCount: {
      type: Number,
      default: null,
    },

    // ── Cancellation Metadata ──
    cancelledBy: {
      type: String,
      enum: ["user", "admin", "system", "payment_failure", null],
      default: null,
    },
    cancelAtCycleEnd: {
      type: Boolean,
      default: true,
    },
    cancellationReason: {
      type: String,
      enum: [
        "user_requested",
        "plan_change",
        "admin_action",
        "payment_failure",
        "system",
        null,
      ],
      default: null,
    },
  },
  {
    strict: "throw",
    timestamps: true,
  },
);

subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ userId: 1, createdAt: -1 });
subscriptionSchema.index({ billingPlan: 1, status: 1 });

const Subscription = model("Subscription", subscriptionSchema);
export default Subscription;

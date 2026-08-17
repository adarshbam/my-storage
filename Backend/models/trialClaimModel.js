import mongoose from "mongoose";

const trialClaimSchema = new mongoose.Schema(
  {
    phoneHash: {
      type: String,
      required: true,
      unique: true,
    },
    firstClaimedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    claimedAt: {
      type: Date,
      default: Date.now,
    },
    claimedIp: {
      type: String,
      default: null,
    },
  },
  {
    strict: "throw",
    timestamps: true,
  }
);

const TrialClaim = mongoose.model("TrialClaim", trialClaimSchema);
export default TrialClaim;

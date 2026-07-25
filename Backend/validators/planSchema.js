import { z } from "zod";

// POST /plans/create-plan
export const createPlanSchema = {
  body: z.object({
    planId: z
      .string()
      .min(1, "Plan ID is required")
      .regex(/^plan_[A-Za-z0-9]+$/, "Invalid Razorpay plan ID format"),
  }),
};

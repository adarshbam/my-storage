import { z } from "zod";

// POST /plans/create-plan

export const createPlanSchema = {
  body: z.object({
    type: z.enum(["Newbie", "Professional", "Ultimate"], {
      error: "Invalid plan type",
    }),
    amount: z.number().min(1),
    currency: z.string().min(1, "Currency of the Plan is required"),
    storage: z.number().min(0),
    period: z.enum(["Daily", "Weekly", "Monthly", "Yearly"]),
  }),
};

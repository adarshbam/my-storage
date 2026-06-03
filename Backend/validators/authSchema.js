import {email, z} from "zod/v4";


export const loginSchema = z.object({
    email: z.email('Please enter a valid email'),
    password: z.string(),
    otp: z.string().optional(),
})

export const registerSchema = z.object({
    name: z.string().min(3, "Name should be at least 3 characters long").max(100, "Name not be above 100 characters"),
    email: z.email('Please enter a valid email'),
    password: z.string(),
})

export const OTPSchema = z.object({
    email: z.email('Please enter a valid email'),
    otp: z.string('Please enter a valid 6 digit OTP').length(6),
})
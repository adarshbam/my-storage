// OTP Controller — stub functions (implement logic manually)

export const sendOtp = async (req, res) => {
  // TODO: Implement OTP sending logic
  // Expected body: { email }
  // 1. Generate OTP
  // 2. Store OTP with expiry (e.g., in DB or cache)
  // 3. Send OTP via email/SMS
  // 4. Return success response

  return res.status(200).json({ message: "OTP sent successfully" });
};

export const verifyOtp = async (req, res) => {
  // TODO: Implement OTP verification logic
  // Expected body: { email, otp }
  // 1. Look up stored OTP for this email
  // 2. Check if OTP matches and hasn't expired
  // 3. Mark user as verified / create session
  // 4. Return success or error

  return res.status(200).json({ message: "OTP verified successfully" });
};

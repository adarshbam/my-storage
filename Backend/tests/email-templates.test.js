import {
  buildOtpEmail,
  buildSecondaryRecoveryOtpEmail,
  buildPasswordResetEmail,
} from "../integrations/email/emailTemplates.js";

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    testsPassed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    testsFailed++;
  }
}

function runEmailTemplateTests() {
  console.log("\n📧 --- RUNNING VAULT EMAIL TEMPLATES TEST SUITE --- 📧\n");

  const testOtp = "849201";
  const testResetUrl = "https://yourvaultstorage.com/reset-password?token=abcdef123456";

  // 1. Test buildOtpEmail
  console.log("Testing buildOtpEmail...");
  const otpEmail = buildOtpEmail({ otp: testOtp, expiryMinutes: 10 });
  assert(otpEmail.subject.includes("Vault"), "OTP subject includes 'Vault'");
  assert(otpEmail.subject.includes(testOtp), "OTP subject includes the OTP code");
  assert(otpEmail.text.includes(testOtp), "OTP plain text includes the OTP code");
  assert(otpEmail.html.includes(testOtp), "OTP HTML contains the OTP code");
  assert(otpEmail.html.includes("VAULT"), "OTP HTML contains VAULT brand header");
  assert(otpEmail.html.includes("10 minutes"), "OTP HTML contains expiry information");
  assert(!/storiff/i.test(otpEmail.html), "OTP HTML does not mention storiffy");
  assert(!/storify/i.test(otpEmail.html), "OTP HTML does not mention storify");
  assert(!/storyfile/i.test(otpEmail.html), "OTP HTML does not mention storyfile");

  // 2. Test buildSecondaryRecoveryOtpEmail
  console.log("\nTesting buildSecondaryRecoveryOtpEmail...");
  const recoveryEmail = buildSecondaryRecoveryOtpEmail({ otp: testOtp, expiryMinutes: 10 });
  assert(recoveryEmail.subject.includes("Vault"), "Secondary recovery subject includes 'Vault'");
  assert(recoveryEmail.subject.includes(testOtp), "Secondary recovery subject includes the OTP code");
  assert(recoveryEmail.text.includes(testOtp), "Secondary recovery plain text includes the OTP code");
  assert(recoveryEmail.html.includes(testOtp), "Secondary recovery HTML contains the OTP code");
  assert(recoveryEmail.html.includes("VAULT"), "Secondary recovery HTML contains VAULT brand header");
  assert(recoveryEmail.html.includes("Secondary Recovery Email"), "Secondary recovery HTML contains feature title");
  assert(!/storiff/i.test(recoveryEmail.html), "Secondary recovery HTML does not mention storiffy");
  assert(!/storify/i.test(recoveryEmail.html), "Secondary recovery HTML does not mention storify");
  assert(!/storyfile/i.test(recoveryEmail.html), "Secondary recovery HTML does not mention storyfile");

  // 3. Test buildPasswordResetEmail
  console.log("\nTesting buildPasswordResetEmail...");
  const resetEmail = buildPasswordResetEmail({ resetUrl: testResetUrl, expiryMinutes: 15 });
  assert(resetEmail.subject.includes("Vault"), "Password reset subject includes 'Vault'");
  assert(resetEmail.html.includes(testResetUrl), "Password reset HTML contains reset URL");
  assert(resetEmail.html.includes("VAULT"), "Password reset HTML contains VAULT brand header");
  assert(resetEmail.html.includes("15 minutes"), "Password reset HTML contains expiry information");
  assert(!/storiff/i.test(resetEmail.html), "Password reset HTML does not mention storiffy");
  assert(!/storify/i.test(resetEmail.html), "Password reset HTML does not mention storify");
  assert(!/storyfile/i.test(resetEmail.html), "Password reset HTML does not mention storyfile");

  console.log("\n=========================================");
  console.log(`Email Template Tests Completed: ${testsPassed} Passed, ${testsFailed} Failed`);
  console.log("=========================================\n");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runEmailTemplateTests();

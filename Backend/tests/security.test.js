import { normalizePhoneNumber } from "../utils/phone.utils.js";
import {
  encryptSecret,
  decryptSecret,
  hashPhoneNumber,
  generateOtp,
  hashOtp,
  generateRecoveryCodes,
  hashRecoveryCode,
} from "../utils/crypto.utils.js";
import * as otplib from "otplib";

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

async function runTests() {
  console.log("\n🔒 --- RUNNING SECURITY SUITE TESTS --- 🔒\n");

  // 1. Phone Normalization Tests
  console.log("📱 Test Group 1: Phone Normalization (E.164)");
  {
    const res1 = normalizePhoneNumber("+919876543210");
    assert(res1.isValid && res1.canonicalPhone === "+919876543210", "Standard +91 with 10 digits");

    const res2 = normalizePhoneNumber("+91 98765 43210");
    assert(res2.isValid && res2.canonicalPhone === "+919876543210", "Spaced phone format");

    const res3 = normalizePhoneNumber("+91-98765-43210");
    assert(res3.isValid && res3.canonicalPhone === "+919876543210", "Hyphenated phone format");

    const res4 = normalizePhoneNumber("9876543210", "IN");
    assert(res4.isValid && res4.canonicalPhone === "+919876543210", "Local Indian number with default country");

    const res5 = normalizePhoneNumber("+1 (415) 555-2671");
    assert(res5.isValid && res5.canonicalPhone === "+14155552671", "US international phone format");

    const res6 = normalizePhoneNumber("12345");
    assert(!res6.isValid, "Rejects malformed short numbers");

    // Deterministic hash check
    const hashA = hashPhoneNumber(res1.canonicalPhone);
    const hashB = hashPhoneNumber(res2.canonicalPhone);
    assert(hashA === hashB && hashA.length === 64, "Deterministic phoneHash equality across formats");
  }

  // 2. Cryptographic Encryption / Decryption Tests
  console.log("\n🔑 Test Group 2: AES-256-GCM TOTP Secret Encryption");
  {
    const testSecret = "JBSWY3DPEHPK3PXP";
    const encrypted = encryptSecret(testSecret);
    assert(encrypted && encrypted.includes(":"), "Secret encrypted with IV:Tag:Cipher format");

    const decrypted = decryptSecret(encrypted);
    assert(decrypted === testSecret, "Decrypted secret matches original plaintext exactly");

    const corrupted = encrypted.slice(0, -4) + "ffff";
    const corruptDecrypted = decryptSecret(corrupted);
    assert(corruptDecrypted === null, "Decryption rejects tampered ciphertext or auth tag mismatch");
  }

  // 3. TOTP & Authenticator Tests
  console.log("\n🕒 Test Group 3: TOTP Generation & Verification");
  {
    const secret = otplib.generateSecret();
    const token = await otplib.generate({ secret });
    const verifyRes = await otplib.verify({ token, secret });
    assert(verifyRes.valid === true, "Valid current TOTP code verifies successfully");

    const isInvalid = await otplib.verify({ token: "000000", secret });
    assert(isInvalid.valid === false, "Invalid code is correctly rejected");
  }

  // 4. Recovery Codes Tests
  console.log("\n🛡️ Test Group 4: Recovery Codes Generation & Hashing");
  {
    const codes = generateRecoveryCodes(10);
    assert(codes.length === 10, "Generates exactly 10 recovery codes");
    assert(codes.every((c) => /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(c)), "Matches XXXX-XXXX-XXXX format");

    const sampleCode = codes[0];
    const hash1 = hashRecoveryCode(sampleCode);
    const hash2 = hashRecoveryCode(sampleCode.toLowerCase().replace(/-/g, " "));
    assert(hash1 === hash2 && hash1.length === 64, "Recovery code hash normalizes spaces/casing/hyphens");
  }

  // 5. OTP Generation & Hashing
  console.log("\n🔢 Test Group 5: Cryptographic OTP Generation");
  {
    const otp1 = generateOtp(6);
    const otp2 = generateOtp(6);
    assert(otp1.length === 6 && /^\d{6}$/.test(otp1), "Generates valid 6-digit numeric OTP");
    assert(hashOtp(otp1) === hashOtp(otp1), "OTP hash is deterministic");
    assert(hashOtp(otp1) !== hashOtp(otp2), "Different OTPs yield distinct hashes");
  }

  console.log("\n=================================================");
  console.log(`TOTAL PASSED: ${testsPassed}`);
  console.log(`TOTAL FAILED: ${testsFailed}`);
  console.log("=================================================\n");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests();

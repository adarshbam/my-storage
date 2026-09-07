/**
 * Vault Email Templates
 * Responsive, modern transactional HTML email templates for Vault Cloud Storage.
 */

const CLIENT_URL = process.env.CLIENT_URL || "https://yourvaultstorage.com";

/**
 * Common Vault Email Shell / Layout
 */
function emailShell({
  preheader = "",
  badgeText = "Security Verification",
  title = "",
  contentHtml = "",
  footerText = "This is an automated security notification from Vault. If you did not request this, you can safely ignore this email.",
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title || "Vault Security"}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body {
      margin: 0;
      padding: 0;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    table {
      border-spacing: 0;
    }
    img {
      border: 0;
    }
    .email-container {
      max-width: 540px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
    }
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        border-radius: 0 !important;
        border: none !important;
      }
      .email-content {
        padding: 28px 20px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 40px 16px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  ${
    preheader
      ? `<div style="display: none; max-height: 0px; overflow: hidden; font-size: 1px; line-height: 1px; color: #fff; opacity: 0;">
          ${preheader}
        </div>`
      : ""
  }
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center">
        <table role="presentation" class="email-container" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 540px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);">
          <!-- Brand Header -->
          <tr>
            <td style="padding: 36px 36px 0 36px; text-align: center;">
              <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="vertical-align: middle;">
                    <!-- Vault Brand Badge -->
                    <div style="display: inline-block; width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); text-align: center; line-height: 44px; box-shadow: 0 4px 10px rgba(15, 23, 42, 0.2);">
                      <span style="color: #10b981; font-size: 22px; font-weight: 900; line-height: 44px; font-family: sans-serif;">⬡</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 10px;">
                    <span style="font-size: 20px; font-weight: 800; letter-spacing: 2px; color: #0f172a; text-transform: uppercase; display: inline-block;">
                      VAULT
                    </span>
                  </td>
                </tr>
                ${
                  badgeText
                    ? `<tr>
                        <td align="center" style="padding-top: 8px;">
                          <span style="display: inline-block; background-color: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; font-size: 11px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; padding: 4px 12px; border-radius: 9999px;">
                            ${badgeText}
                          </span>
                        </td>
                      </tr>`
                    : ""
                }
              </table>
            </td>
          </tr>

          <!-- Main Body Content -->
          <tr>
            <td class="email-content" style="padding: 28px 36px 36px 36px; text-align: center; color: #334155;">
              ${contentHtml}

              <!-- Divider -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 32px; border-top: 1px solid #e2e8f0;">
                <tr><td></td></tr>
              </table>

              <!-- Footer -->
              <div style="padding-top: 24px; font-size: 12px; line-height: 1.6; color: #94a3b8; text-align: center;">
                <p style="margin: 0 0 8px 0;">
                  <a href="${CLIENT_URL}" style="color: #64748b; text-decoration: none; font-weight: 600;">Vault Cloud Storage</a> &bull; End-to-End Encrypted Cloud Infrastructure
                </p>
                <p style="margin: 0; color: #94a3b8;">
                  ${footerText}
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Builds the modern OTP Verification Email for registration and login
 */
export function buildOtpEmail({ otp, expiryMinutes = 10 }) {
  const subject = `Your Vault Verification Code: ${otp}`;
  const preheader = `Use verification code ${otp} to complete your authentication with Vault. Valid for ${expiryMinutes} minutes.`;

  const contentHtml = `
    <h1 style="margin: 16px 0 10px 0; font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.4px;">
      Verify Your Identity
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #64748b;">
      Use the 6-digit verification code below to complete your authentication and access your encrypted Vault storage.
    </p>

    <!-- OTP Code Display Card -->
    <div style="margin: 20px auto; padding: 20px 24px; background: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 12px; max-width: 320px; text-align: center;">
      <div style="font-family: ui-monospace, 'SFMono-Regular', 'SF Mono', Menlo, Consolas, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #0f172a; user-select: all; -webkit-user-select: all;">
        ${otp}
      </div>
      <div style="font-size: 11px; font-weight: 600; color: #94a3b8; letter-spacing: 0.5px; text-transform: uppercase; margin-top: 6px;">
        One-Time Passcode
      </div>
    </div>

    <!-- Expiry & Security Notice Box -->
    <div style="margin-top: 24px; padding: 14px 18px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; text-align: left; font-size: 13px; line-height: 1.5; color: #475569;">
      <div style="margin-bottom: 6px;">
        <span style="font-weight: 700; color: #0f172a;">⏱ Expiration:</span> This code will expire in <strong>${expiryMinutes} minutes</strong>.
      </div>
      <div>
        <span style="font-weight: 700; color: #0f172a;">🔒 Security Notice:</span> Never share this code with anyone. Vault staff will never ask for your verification code.
      </div>
    </div>
  `;

  const text = `Your Vault verification code is ${otp}. It will expire in ${expiryMinutes} minutes.\n\nIf you did not request this verification code, please ignore this email.`;

  return {
    subject,
    text,
    html: emailShell({
      preheader,
      badgeText: "Account Verification",
      title: "Your Vault Verification Code",
      contentHtml,
    }),
  };
}

/**
 * Builds the modern Secondary Recovery Email Verification Email
 */
export function buildSecondaryRecoveryOtpEmail({ otp, expiryMinutes = 10 }) {
  const subject = `Vault — Secondary Recovery Email Verification Code: ${otp}`;
  const preheader = `Your Vault secondary recovery email verification code is ${otp}. Valid for ${expiryMinutes} minutes.`;

  const contentHtml = `
    <h1 style="margin: 16px 0 10px 0; font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.4px;">
      Secondary Recovery Email
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #64748b;">
      You requested to link this email address as the <strong>Secondary Recovery Email</strong> for your Vault account.
    </p>

    <!-- OTP Code Display Card -->
    <div style="margin: 20px auto; padding: 20px 24px; background: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 12px; max-width: 320px; text-align: center;">
      <div style="font-family: ui-monospace, 'SFMono-Regular', 'SF Mono', Menlo, Consolas, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #0f172a; user-select: all; -webkit-user-select: all;">
        ${otp}
      </div>
      <div style="font-size: 11px; font-weight: 600; color: #94a3b8; letter-spacing: 0.5px; text-transform: uppercase; margin-top: 6px;">
        Recovery Confirmation Code
      </div>
    </div>

    <!-- Expiry & Security Notice Box -->
    <div style="margin-top: 24px; padding: 14px 18px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; text-align: left; font-size: 13px; line-height: 1.5; color: #475569;">
      <div style="margin-bottom: 6px;">
        <span style="font-weight: 700; color: #0f172a;">⏱ Expiration:</span> This code will expire in <strong>${expiryMinutes} minutes</strong>.
      </div>
      <div>
        <span style="font-weight: 700; color: #0f172a;">🛡 Account Protection:</span> This address will be authorized to receive recovery alerts and help restore account access if you lose access to your primary credentials.
      </div>
    </div>
  `;

  const text = `Your Vault secondary recovery email verification code is ${otp}. Valid for ${expiryMinutes} minutes.\n\nIf you did not initiate this request, you can safely ignore this email.`;

  return {
    subject,
    text,
    html: emailShell({
      preheader,
      badgeText: "Recovery & Security",
      title: "Secondary Recovery Email Verification",
      contentHtml,
    }),
  };
}

/**
 * Builds the modern Password Reset Email
 */
export function buildPasswordResetEmail({ resetUrl, expiryMinutes = 15 }) {
  const subject = "Reset Your Vault Password";
  const preheader = `We received a request to reset your Vault account password. Link expires in ${expiryMinutes} minutes.`;

  const contentHtml = `
    <h1 style="margin: 16px 0 10px 0; font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.4px;">
      Password Reset Request
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #64748b;">
      We received a request to reset the password for your Vault account. Click the button below to choose a new secure password:
    </p>

    <!-- Reset Button CTA -->
    <div style="margin: 28px 0;">
      <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background-color: #0f172a; color: #ffffff; text-decoration: none; border-radius: 10px; font-size: 15px; font-weight: 700; letter-spacing: 0.2px; box-shadow: 0 4px 10px rgba(15, 23, 42, 0.2);">
        Reset My Password
      </a>
    </div>

    <!-- URL Fallback -->
    <p style="margin: 20px 0 0 0; font-size: 13px; line-height: 1.5; color: #94a3b8;">
      If the button above does not work, copy and paste this link into your browser:
      <br />
      <a href="${resetUrl}" style="color: #10b981; word-break: break-all; text-decoration: underline;">${resetUrl}</a>
    </p>

    <!-- Expiry & Security Notice Box -->
    <div style="margin-top: 28px; padding: 14px 18px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; text-align: left; font-size: 13px; line-height: 1.5; color: #475569;">
      <div style="margin-bottom: 6px;">
        <span style="font-weight: 700; color: #0f172a;">⏱ Expiration:</span> This link will expire in <strong>${expiryMinutes} minutes</strong>.
      </div>
      <div>
        <span style="font-weight: 700; color: #0f172a;">🔒 Security Notice:</span> If you did not request a password reset, please ignore this email or review your account activity if you suspect unauthorized access.
      </div>
    </div>
  `;

  const text = `We received a request to reset your Vault account password.\n\nReset your password using the link below:\n${resetUrl}\n\nThis link will expire in ${expiryMinutes} minutes.\n\nIf you did not request a password reset, you can safely ignore this email.`;

  return {
    subject,
    text,
    html: emailShell({
      preheader,
      badgeText: "Password Recovery",
      title: "Reset Your Vault Password",
      contentHtml,
    }),
  };
}

import nodemailer from "nodemailer";

export default async function sendEmail(mail) {
  const transporter =
    process.env.NODE_ENV === "test"
      ? nodemailer.createTransport({ jsonTransport: true })
      : nodemailer.createTransport({
          host: process.env.SMTP_HOST || "smtp.gmail.com",
          port: Number(process.env.SMTP_PORT) || 587,
          secure: false,
          requireTLS: true,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
  try {
    const mailOptions = {
      from:
        mail.from ||
        `"Vault" <${process.env.SMTP_USER || "no-reply@vault.com"}>`,
      ...mail,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("Message sent: %s", info.messageId);
    return info;
  } catch (err) {
    console.error("Error while sending mail:", err);
    throw err;
  }
}

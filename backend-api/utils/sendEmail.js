import nodemailer from "nodemailer";

export const sendOtpEmail = async (email, otp, fullName) => {
  try {
    console.log(`\n========================================`);
    console.log(`[EMAIL OTP SYSTEM]`);
    console.log(`Recipient: ${email} (${fullName})`);
    console.log(`Verification OTP: >>> ${otp} <<<`);
    console.log(`Valid for: 10 minutes`);
    console.log(`========================================\n`);

    // If SMTP credentials are configured in .env, send actual email
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const mailOptions = {
        from: `"${process.env.SMTP_FROM_NAME || "Prodesk IT Chat"}" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `${otp} is your Registration Verification Code`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; background-color: #f4f7f6;">
            <div style="max-width: 500px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #6366f1; margin-top: 0;">Prodesk IT Real-Time Portal</h2>
              <p>Hello <strong>${fullName}</strong>,</p>
              <p>Thank you for registering. Please use the verification code below to complete your registration:</p>
              <div style="background-color: #e0e7ff; padding: 15px; text-align: center; border-radius: 6px; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4338ca;">${otp}</span>
              </div>
              <p style="font-size: 13px; color: #6b7280;">This code is valid for 10 minutes. If you did not request this code, please ignore this email.</p>
            </div>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`[EMAIL OTP SYSTEM] Successfully sent email via SMTP to ${email}`);
    }

    return true;
  } catch (error) {
    console.error("[EMAIL OTP SYSTEM ERROR]", error);
    // Still return true so user can complete registration with logged OTP in dev environment if SMTP fails
    return true;
  }
};

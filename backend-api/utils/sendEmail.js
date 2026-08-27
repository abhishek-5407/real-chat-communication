import nodemailer from "nodemailer";

export const sendOtpEmail = async (email, otp, fullName) => {
  try {
    console.log(`\n========================================`);
    console.log(`[EMAIL OTP SYSTEM]`);
    console.log(`Recipient: ${email} (${fullName})`);
    console.log(`OTP Code: ${otp}`);
    console.log(`Sending verification code...`);
    console.log(`========================================\n`);

    const emailHtml = `
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
    `;

    // Priority 1: Resend.com API (Instant Delivery on Cloud Hosts like Render & Vercel)
    if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.startsWith("re_")) {
      try {
        console.log(`[EMAIL OTP SYSTEM] Attempting to send via Resend.com API...`);
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}`,
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL || "Prodesk IT Chat <onboarding@resend.dev>",
            to: [email],
            subject: `${otp} is your Registration Verification Code`,
            html: emailHtml,
          }),
        });

        const resData = await response.json();

        if (response.ok) {
          console.log(`[EMAIL OTP SYSTEM] Successfully sent email via Resend API to ${email} (ID: ${resData.id})`);
          return { success: true, method: "resend" };
        }

        console.error(`[EMAIL OTP SYSTEM ERROR] Resend API error:`, resData.message || resData);
        if (resData.message && resData.message.includes("testing emails to your own email address")) {
          console.warn(`\n⚠️ Resend Free Tier Restriction: Emails can only be delivered to registered email (abhi5407ass@gmail.com).`);
          console.warn(`Attempting SMTP fallback if configured...\n`);
        }
      } catch (resErr) {
        console.error("[EMAIL OTP RESEND FETCH ERROR]", resErr.message || resErr);
      }
    }

    // Priority 2: Nodemailer SMTP
    if (
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.SMTP_USER !== "your_email@gmail.com"
    ) {
      try {
        const isGmail = process.env.SMTP_HOST.includes("gmail");
        
        const transportConfig = isGmail
          ? {
              service: "gmail",
              auth: {
                user: process.env.SMTP_USER.trim(),
                pass: process.env.SMTP_PASS.replace(/\s+/g, ""),
              },
              connectionTimeout: 8000,
              greetingTimeout: 8000,
              socketTimeout: 8000,
            }
          : {
              host: process.env.SMTP_HOST,
              port: Number(process.env.SMTP_PORT) || 587,
              secure: process.env.SMTP_SECURE === "true",
              auth: {
                user: process.env.SMTP_USER.trim(),
                pass: process.env.SMTP_PASS.replace(/\s+/g, ""),
              },
              tls: { rejectUnauthorized: false },
              connectionTimeout: 8000,
              greetingTimeout: 8000,
              socketTimeout: 8000,
            };

        const transporter = nodemailer.createTransport(transportConfig);

        const mailOptions = {
          from: `"${process.env.SMTP_FROM_NAME || "Prodesk IT Chat"}" <${process.env.SMTP_USER}>`,
          to: email,
          subject: `${otp} is your Registration Verification Code`,
          html: emailHtml,
        };

        const sendPromise = transporter.sendMail(mailOptions);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("SMTP email sending timed out after 7 seconds.")), 7000)
        );

        await Promise.race([sendPromise, timeoutPromise]);
        console.log(`[EMAIL OTP SYSTEM] Successfully sent email via SMTP to ${email}`);
        return { success: true, method: "smtp" };
      } catch (smtpError) {
        console.error("[EMAIL OTP SMTP ERROR]", smtpError.message || smtpError);
      }
    }

    console.log(`[EMAIL OTP DEV FALLBACK] No active email transport succeeded. FOR TESTING, OTP FOR ${email} IS: ${otp}`);
    return { success: false, method: "dev_fallback", otp };
  } catch (error) {
    console.error("[EMAIL OTP SYSTEM CRITICAL ERROR]", error.message || error);
    return { success: false, method: "error", otp };
  }
};



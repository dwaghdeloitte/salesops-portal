const nodemailer = require('nodemailer');

let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  } else {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass }
    });
    console.log('\n📬 Ethereal test account:', testAccount.user);
  }
  return transporter;
}

async function sendOTP(email, otp) {
  const t = await getTransporter();
  const info = await t.sendMail({
    from: '"TeamHub" <noreply@teamhub.deloitte.com>',
    to: email,
    subject: 'Your TeamHub verification code',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px">
        <h2 style="color:#1d4ed8;margin-bottom:8px">TeamHub</h2>
        <p style="color:#374151">Your verification code is:</p>
        <div style="font-size:36px;font-weight:700;letter-spacing:12px;color:#111827;margin:24px 0;text-align:center;background:#f3f4f6;padding:16px;border-radius:8px">${otp}</div>
        <p style="color:#6b7280;font-size:14px">This code expires in 10 minutes. Do not share it with anyone.</p>
      </div>
    `
  });

  const preview = nodemailer.getTestMessageUrl(info);
  console.log(`\n🔑 OTP for ${email}: ${otp}`);
  if (preview) console.log(`📧 View email: ${preview}`);
  return { previewUrl: preview || null };
}

module.exports = { sendOTP };

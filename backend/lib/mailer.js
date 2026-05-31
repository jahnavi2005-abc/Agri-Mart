import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendMail(to, subject, html) {
  try {
    await transporter.sendMail({
      from: `"AgriMart 🌾" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error('[mailer] Failed to send email:', err.message);
  }
}

export function orderPlacedEmail(buyerName, orders) {
  const total = orders.reduce((s, o) => s + Number(o.total_amount), 0);
  return {
    subject: '✅ Order Placed — AgriMart',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h1 style="color:#22c55e;">AgriMart 🌾</h1>
        <h2>Hi ${buyerName}, your order is placed!</h2>
        <p>We've received your order and the farmer has been notified.</p>
        <table style="width:100%;border-collapse:collapse;">
          ${orders.map(o => `<tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:8px;">Order #${o.id.slice(0,8)}</td>
            <td style="padding:8px;text-align:right;font-weight:bold;">₹${o.total_amount}</td>
          </tr>`).join('')}
        </table>
        <p style="font-size:18px;font-weight:bold;margin-top:16px;">Total: ₹${total}</p>
        <p style="color:#6b7280;font-size:13px;">Payment method: Cash on Delivery</p>
        <hr/>
        <p style="font-size:12px;color:#9ca3af;">AgriMart — Farm Fresh, Direct to You</p>
      </div>
    `,
  };
}

export function orderStatusEmail(buyerName, orderId, status) {
  const messages = {
    accepted:   { emoji: '👨‍🌾', msg: 'Your order has been accepted by the farmer and is being prepared.' },
    packed:     { emoji: '📦', msg: 'Your order is packed and ready for dispatch.' },
    dispatched: { emoji: '🚚', msg: 'Your order is on the way! Expect delivery in 1–3 days.' },
    delivered:  { emoji: '🎉', msg: 'Your order has been delivered. Please review the product on AgriMart.' },
    cancelled:  { emoji: '❌', msg: 'Your order has been cancelled. Contact support if you have questions.' },
  };
  const info = messages[status] || { emoji: '📋', msg: `Order status updated to: ${status}` };
  return {
    subject: `${info.emoji} Order ${status.charAt(0).toUpperCase() + status.slice(1)} — AgriMart`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h1 style="color:#22c55e;">AgriMart 🌾</h1>
        <h2>Hi ${buyerName}, ${info.emoji}</h2>
        <p>${info.msg}</p>
        <p style="color:#6b7280;font-size:13px;">Order ID: ${orderId}</p>
        <hr/>
        <p style="font-size:12px;color:#9ca3af;">AgriMart — Farm Fresh, Direct to You</p>
      </div>
    `,
  };
}

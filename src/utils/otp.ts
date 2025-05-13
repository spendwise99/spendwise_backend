import nodemailer from "nodemailer";
import dotenv from "dotenv";
import User from "../models/User.model";

dotenv.config();

// Create a transporter using Gmail SMTP
const transporter = nodemailer.createTransport({
  service: "gmail", // Gmail service
  auth: {
    user: process.env.GMAIL_USER, // Your Gmail email address
    pass: process.env.GMAIL_PASSWORD, // Your Gmail app password (not your Gmail account password)
  },
});

// Function to generate a random 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOTPEmail = async (email: string, otp: string) => {
  const mailOptions = {
    from: process.env.GMAIL_USER, // Your Gmail email address
    to: email, // Recipient's email address
    subject: "Your OTP Verification Code", // Email subject
    html: `
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f4f4f9;
              margin: 0;
              padding: 0;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 30px auto;
              background-color: #fff;
              padding: 20px;
              border-radius: 8px;
              box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
              text-align: center;
            }
            .header {
              font-size: 24px;
              font-weight: bold;
              color: #4CAF50;
              margin-bottom: 20px;
            }
            .otp-code {
              font-size: 36px;
              font-weight: bold;
              color: #4CAF50;
              background-color: #f1f1f1;
              padding: 20px;
              border-radius: 6px;
              margin: 20px 0;
            }
            .footer {
              font-size: 14px;
              color: #888;
            }
            .footer a {
              color: #4CAF50;
              text-decoration: none;
            }
            .btn {
              background-color: #4CAF50;
              color: white;
              padding: 10px 20px;
              text-decoration: none;
              border-radius: 4px;
              margin-top: 20px;
              display: inline-block;
            }
            .btn:hover {
              background-color: #45a049;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              OTP Verification Code
            </div>
            <p>Hello,</p>
            <p>We received a request to verify your account. Use the following One-Time Password (OTP) to complete the process:</p>
            <div class="otp-code">
              ${otp}
            </div>
            <p>This OTP is valid for the next 10 minutes. If you didn't request this, please ignore this email.</p>
          </div>
        </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error("Error sending OTP email:", error);
    throw new Error("Failed to send OTP email");
  }
};

type PaymentEmailType = "sent" | "received";

interface SendPaymentEmailParams {
  to: string;
  name: string;
  type: PaymentEmailType;
  amount: number;
  otherParty: string;
  message?: string;
  balanceAfter: number;
}

const sendPaymentEmail = async ({
  to,
  name,
  type,
  amount,
  otherParty,
  message,
  balanceAfter,
}: SendPaymentEmailParams): Promise<void> => {
  const subject =
    type === "sent" ? "Payment Sent Successfully" : "Payment Received";
  const heading =
    type === "sent" ? "You've sent a payment!" : "You've received a payment!";
  const color = type === "sent" ? "#f44336" : "#4CAF50";

  const html = `
    <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f9;
            margin: 0;
            padding: 0;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 30px auto;
            background-color: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
            text-align: center;
          }
          .header {
            font-size: 24px;
            font-weight: bold;
            color: ${color};
            margin-bottom: 20px;
          }
          .details {
            font-size: 18px;
            margin: 10px 0;
          }
          .balance {
            margin-top: 20px;
            padding: 15px;
            background-color: #f1f1f1;
            border-radius: 6px;
            font-weight: bold;
          }
          .footer {
            font-size: 14px;
            color: #888;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">${heading}</div>
          <p>Hi ${name},</p>
          <p class="details">
            ${type === "sent" ? "You sent" : "You received"} 
            <strong>$${amount.toFixed(2)}</strong> 
            ${type === "sent" ? "to" : "from"} <strong>${otherParty}</strong>
          </p>
          ${
            message ? `<p class="details">Message: <em>${message}</em></p>` : ""
          }
          <div class="balance">
            Your updated balance: $${balanceAfter.toFixed(2)}
          </div>
          <div class="footer">
            Thank you for using our service.
          </div>
        </div>
      </body>
    </html>
  `;

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to,
    subject,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Payment email sent to ${to}`);
  } catch (err) {
    console.error("Error sending payment email:", err);
    throw new Error("Failed to send payment email");
  }
};

export { generateOTP, sendOTPEmail, sendPaymentEmail };

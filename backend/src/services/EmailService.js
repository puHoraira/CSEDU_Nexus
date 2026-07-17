const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const { ApiError } = require("../core/ApiError");

class EmailService {
  static transporter = null;

  static async initialize() {
    if (this.transporter) return this.transporter;

    // Configure transporter based on environment
    const config = {
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true" || false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    };

    // For development, use test account if no SMTP credentials
    if (!config.auth.user || !config.auth.pass) {
      if (process.env.NODE_ENV === "development") {
        console.log("Creating test email account for development...");
        const testAccount = await nodemailer.createTestAccount();
        config.host = "smtp.ethereal.email";
        config.port = 587;
        config.secure = false;
        config.auth = {
          user: testAccount.user,
          pass: testAccount.pass
        };
      } else {
        throw new Error("SMTP credentials are required in production");
      }
    }

    this.transporter = nodemailer.createTransport(config);
    
    // Verify connection
    try {
      await this.transporter.verify();
      console.log("Email service initialized successfully");
    } catch (error) {
      console.error("Email service initialization failed:", error);
      throw new Error("Failed to initialize email service");
    }

    return this.transporter;
  }

  static generateVerificationToken() {
    return {
      token: crypto.randomBytes(32).toString("hex"),
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };
  }

  static generatePasswordResetToken() {
    return {
      token: crypto.randomBytes(32).toString("hex"),
      expires: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    };
  }

  static async sendVerificationEmail(user, verificationToken) {
    await this.initialize();

    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;

    const htmlContent = this.getVerificationEmailTemplate(user, verificationUrl);
    const textContent = this.getVerificationEmailText(user, verificationUrl);

    const mailOptions = {
      from: {
        name: "CSEDU Nexus",
        address: process.env.SMTP_FROM || process.env.SMTP_USER
      },
      to: user.email,
      subject: "Verify Your Email Address - CSEDU Nexus",
      text: textContent,
      html: htmlContent
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      
      // Log preview URL for development
      if (process.env.NODE_ENV === "development") {
        console.log("\n============================================");
        console.log("📧 VERIFICATION EMAIL SENT");
        console.log("============================================");
        console.log("To:", user.email);
        console.log("Verification URL:", verificationUrl);
        console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
        console.log("============================================\n");
      }

      return {
        success: true,
        messageId: info.messageId,
        previewUrl: nodemailer.getTestMessageUrl(info),
        verificationUrl: process.env.NODE_ENV === "development" ? verificationUrl : undefined
      };
    } catch (error) {
      console.error("Failed to send verification email:", error);
      console.error("Error details:", error.message);
      
      // In development, still return success with the verification URL
      if (process.env.NODE_ENV === "development") {
        console.warn("\n⚠️  Email sending failed, but in development mode.");
        console.log("Use this verification URL directly:");
        console.log(verificationUrl);
        console.log("\n");
        
        return {
          success: true,
          messageId: "dev-bypass",
          error: error.message,
          verificationUrl: verificationUrl
        };
      }
      
      throw new ApiError(500, "Failed to send verification email");
    }
  }

  static async sendPasswordResetEmail(user, resetToken) {
    await this.initialize();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;

    const htmlContent = this.getPasswordResetEmailTemplate(user, resetUrl);
    const textContent = this.getPasswordResetEmailText(user, resetUrl);

    const mailOptions = {
      from: {
        name: "CSEDU Nexus",
        address: process.env.SMTP_FROM || process.env.SMTP_USER
      },
      to: user.email,
      subject: "Reset Your Password - CSEDU Nexus",
      text: textContent,
      html: htmlContent
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      
      // Log preview URL for development
      if (process.env.NODE_ENV === "development") {
        console.log("\n============================================");
        console.log("🔐 PASSWORD RESET EMAIL SENT");
        console.log("============================================");
        console.log("To:", user.email);
        console.log("Reset URL:", resetUrl);
        console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
        console.log("============================================\n");
      }

      return {
        success: true,
        messageId: info.messageId,
        previewUrl: nodemailer.getTestMessageUrl(info),
        resetUrl: process.env.NODE_ENV === "development" ? resetUrl : undefined
      };
    } catch (error) {
      console.error("Failed to send password reset email:", error);
      console.error("Error details:", error.message);
      
      // In development, still return success with the reset URL
      if (process.env.NODE_ENV === "development") {
        console.warn("\n⚠️  Email sending failed, but in development mode.");
        console.log("Use this reset URL directly:");
        console.log(resetUrl);
        console.log("\n");
        
        return {
          success: true,
          messageId: "dev-bypass",
          error: error.message,
          resetUrl: resetUrl
        };
      }
      
      throw new ApiError(500, "Failed to send password reset email");
    }
  }

  static async sendWelcomeEmail(user) {
    await this.initialize();

    const htmlContent = this.getWelcomeEmailTemplate(user);
    const textContent = this.getWelcomeEmailText(user);

    const mailOptions = {
      from: {
        name: "CSEDU Nexus",
        address: process.env.SMTP_FROM || process.env.SMTP_USER
      },
      to: user.email,
      subject: "Welcome to CSEDU Nexus!",
      text: textContent,
      html: htmlContent
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      console.error("Failed to send welcome email:", error);
      // Don't throw error for welcome email failure
      return { success: false, error: error.message };
    }
  }

  static getVerificationEmailTemplate(user, verificationUrl) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email - CSEDU Nexus</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            background: white;
            padding: 30px;
            border: 1px solid #e0e0e0;
            border-top: none;
        }
        .button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin: 20px 0;
        }
        .button:hover {
            background: #5a6fd8;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 14px;
            color: #666;
            border-radius: 0 0 8px 8px;
        }
        .warning {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎓 CSEDU Nexus</h1>
        <p>Computer Science & Engineering Department, University of Dhaka</p>
    </div>
    
    <div class="content">
        <h2>Welcome ${user.firstName} ${user.lastName}!</h2>
        
        <p>Thank you for registering with CSEDU Nexus. To complete your registration and start using your account, please verify your email address.</p>
        
        <p style="text-align: center;">
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
        </p>
        
        <div class="warning">
            <strong>⏰ Important:</strong> This verification link will expire in 24 hours.
        </div>
        
        <p><strong>If the button doesn't work, copy and paste this link into your browser:</strong></p>
        <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 5px;">
            ${verificationUrl}
        </p>
        
        <hr style="margin: 30px 0;">
        
        <h3>What's Next?</h3>
        <ul>
            <li>✅ Verify your email address</li>
            <li>🔐 Log in to your account</li>
            <li>👤 Complete your profile</li>
            <li>🎯 Explore club features and events</li>
        </ul>
        
        <p>If you didn't create an account with CSEDU Nexus, please ignore this email.</p>
    </div>
    
    <div class="footer">
        <p>
            <strong>CSEDU Nexus</strong><br>
            Computer Science & Engineering Department<br>
            University of Dhaka
        </p>
        <p>
            <a href="${process.env.FRONTEND_URL}">Visit Website</a> | 
            <a href="mailto:${process.env.SMTP_FROM || 'support@csedu-nexus.com'}">Contact Support</a>
        </p>
    </div>
</body>
</html>
    `;
  }

  static getVerificationEmailText(user, verificationUrl) {
    return `
CSEDU Nexus - Verify Your Email Address

Hello ${user.firstName} ${user.lastName},

Thank you for registering with CSEDU Nexus. To complete your registration, please verify your email address by visiting:

${verificationUrl}

This verification link will expire in 24 hours.

What's Next:
- Verify your email address
- Log in to your account
- Complete your profile
- Explore club features and events

If you didn't create an account with CSEDU Nexus, please ignore this email.

---
CSEDU Nexus
Computer Science & Engineering Department
University of Dhaka

Website: ${process.env.FRONTEND_URL}
Support: ${process.env.SMTP_FROM || 'support@csedu-nexus.com'}
    `;
  }

  static getPasswordResetEmailTemplate(user, resetUrl) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password - CSEDU Nexus</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            background: white;
            padding: 30px;
            border: 1px solid #e0e0e0;
            border-top: none;
        }
        .button {
            display: inline-block;
            background: #ff6b6b;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin: 20px 0;
        }
        .button:hover {
            background: #ff5252;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 14px;
            color: #666;
            border-radius: 0 0 8px 8px;
        }
        .warning {
            background: #ffebee;
            border: 1px solid #ffcdd2;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .security-tips {
            background: #e8f5e8;
            border: 1px solid #c8e6c9;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔐 Password Reset</h1>
        <p>CSEDU Nexus</p>
    </div>
    
    <div class="content">
        <h2>Hello ${user.firstName},</h2>
        
        <p>We received a request to reset the password for your CSEDU Nexus account.</p>
        
        <p style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
        </p>
        
        <div class="warning">
            <strong>⏰ Security Notice:</strong> This password reset link will expire in 1 hour for your security.
        </div>
        
        <p><strong>If the button doesn't work, copy and paste this link into your browser:</strong></p>
        <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 5px;">
            ${resetUrl}
        </p>
        
        <div class="security-tips">
            <h3>🛡️ Security Tips:</h3>
            <ul>
                <li>Choose a strong, unique password</li>
                <li>Use a combination of letters, numbers, and symbols</li>
                <li>Don't reuse passwords from other accounts</li>
                <li>Consider using a password manager</li>
            </ul>
        </div>
        
        <p><strong>Didn't request this?</strong> If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
        
        <p>If you have any concerns about your account security, please contact our support team immediately.</p>
    </div>
    
    <div class="footer">
        <p>
            <strong>CSEDU Nexus</strong><br>
            Computer Science & Engineering Department<br>
            University of Dhaka
        </p>
        <p>
            <a href="${process.env.FRONTEND_URL}">Visit Website</a> | 
            <a href="mailto:${process.env.SMTP_FROM || 'support@csedu-nexus.com'}">Contact Support</a>
        </p>
    </div>
</body>
</html>
    `;
  }

  static getPasswordResetEmailText(user, resetUrl) {
    return `
CSEDU Nexus - Reset Your Password

Hello ${user.firstName},

We received a request to reset the password for your CSEDU Nexus account.

To reset your password, visit: ${resetUrl}

This password reset link will expire in 1 hour for your security.

Security Tips:
- Choose a strong, unique password
- Use a combination of letters, numbers, and symbols
- Don't reuse passwords from other accounts
- Consider using a password manager

If you didn't request a password reset, please ignore this email. Your password will remain unchanged.

---
CSEDU Nexus
Computer Science & Engineering Department
University of Dhaka

Website: ${process.env.FRONTEND_URL}
Support: ${process.env.SMTP_FROM || 'support@csedu-nexus.com'}
    `;
  }

  static getWelcomeEmailTemplate(user) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to CSEDU Nexus!</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            background: white;
            padding: 30px;
            border: 1px solid #e0e0e0;
            border-top: none;
        }
        .button {
            display: inline-block;
            background: #4caf50;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin: 20px 0;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 14px;
            color: #666;
            border-radius: 0 0 8px 8px;
        }
        .features {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 20px 0;
        }
        .feature {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎉 Welcome to CSEDU Nexus!</h1>
        <p>Your account has been successfully verified</p>
    </div>
    
    <div class="content">
        <h2>Hello ${user.firstName},</h2>
        
        <p>Congratulations! Your email has been verified and your CSEDU Nexus account is now active. You can now access all the features of our student organization platform.</p>
        
        <p style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Go to Dashboard</a>
        </p>
        
        <h3>🚀 What You Can Do Now:</h3>
        
        <div class="features">
            <div class="feature">
                <h4>🗳️ Elections</h4>
                <p>Participate in club elections and vote for representatives</p>
            </div>
            <div class="feature">
                <h4>📅 Events</h4>
                <p>Register for workshops, seminars, and club events</p>
            </div>
            <div class="feature">
                <h4>🤝 Meetings</h4>
                <p>Join virtual meetings and stay connected with members</p>
            </div>
            <div class="feature">
                <h4>💰 Finance</h4>
                <p>Track membership fees and financial transactions</p>
            </div>
        </div>
        
        <h3>📝 Next Steps:</h3>
        <ul>
            <li>Complete your profile with additional information</li>
            <li>Upload a profile picture</li>
            <li>Explore upcoming events and register</li>
            <li>Connect with other members</li>
        </ul>
        
        <p>If you have any questions or need assistance, don't hesitate to reach out to our support team.</p>
    </div>
    
    <div class="footer">
        <p>
            <strong>CSEDU Nexus</strong><br>
            Computer Science & Engineering Department<br>
            University of Dhaka
        </p>
        <p>
            <a href="${process.env.FRONTEND_URL}">Visit Dashboard</a> | 
            <a href="mailto:${process.env.SMTP_FROM || 'support@csedu-nexus.com'}">Contact Support</a>
        </p>
    </div>
</body>
</html>
    `;
  }

  static getWelcomeEmailText(user) {
    return `
Welcome to CSEDU Nexus!

Hello ${user.firstName},

Congratulations! Your email has been verified and your CSEDU Nexus account is now active.

What You Can Do Now:
- Participate in club elections
- Register for events and workshops
- Join virtual meetings
- Track financial transactions

Next Steps:
- Complete your profile
- Upload a profile picture
- Explore upcoming events
- Connect with other members

Dashboard: ${process.env.FRONTEND_URL}/dashboard

---
CSEDU Nexus
Computer Science & Engineering Department
University of Dhaka

Website: ${process.env.FRONTEND_URL}
Support: ${process.env.SMTP_FROM || 'support@csedu-nexus.com'}
    `;
  }
}

module.exports = { EmailService };
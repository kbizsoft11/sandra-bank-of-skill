// emailService.ts
import nodemailer from 'nodemailer';
import { env } from '../config/env';

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
    
}

const smtpAuth = env.SMTP_USER && env.SMTP_PASSWORD
    ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
    : undefined;

const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: smtpAuth,
    tls: {
        rejectUnauthorized: false,
    },
});

transporter.verify((error) => {
    if (error) {
        console.error('SMTP connection error:', error);
    } else {
        console.log('SMTP server is ready to send emails');
    }
});

/**
 * Send email using Nodemailer
 */
const sendEmail = async (options: EmailOptions): Promise<void> => {
    const mailOptions = {
        from: env.EMAIL_FROM,
        to: options.to,
        subject: options.subject,
        text: options.text || '',
        html: options.html,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully:', info.messageId);
        if (process.env.NODE_ENV !== 'production') {
            console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info) || 'No preview available');
        }
    } catch (error) {
        console.error('❌ Failed to send email:', error);
        throw new Error('Email sending failed');
    }
};

/**
 * Send OTP verification email
 */
export const sendVerificationEmail = async (
    email: string,
    otp: string,
    name: string
): Promise<void> => {
    console.log('🟢 sendVerificationEmail called');
    console.log('🟢 Email:', email);
    console.log('🟢 OTP:', otp);
    console.log('🟢 Name:', name);
    console.log('🟢 NODE_ENV:', process.env.NODE_ENV);
    
    const subject = 'Verify Your Email - Bank of Skill';

    if (process.env.NODE_ENV !== 'production') {
        console.log('\n========== DEV OTP CODE ==========');
        console.log('Email:', email);
        console.log('OTP:', otp);
        console.log('==================================\n');
    } else {
        console.log('🔴 Skipping OTP log - NODE_ENV is production');
    }
    
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
                .content { padding: 30px; background: #f9f9f9; }
                .otp-box { background: white; padding: 20px; text-align: center; margin: 20px 0; border: 2px dashed #4F46E5; border-radius: 8px; }
                .otp-code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4F46E5; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Bank of Skill</h1>
                </div>
                <div class="content">
                    <h2>Welcome to Bank of Skill, ${name}!</h2>
                    <p>Thank you for signing up. To complete your registration, please verify your email address.</p>
                    
                    <div class="otp-box">
                        <p style="margin: 0 0 10px 0;">Your verification code is:</p>
                        <div class="otp-code">${otp}</div>
                    </div>
                    
                    <p><strong>This code will expire in 10 minutes.</strong></p>
                    <p>If you didn't request this code, please ignore this email.</p>
                </div>
                <div class="footer">
                    <p>&copy; ${new Date().getFullYear()} Bank of Skill. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const text = `
        Welcome to Bank of Skill, ${name}!
        
        Your verification code is: ${otp}
        
        This code will expire in 10 minutes.
        
        If you didn't request this code, please ignore this email.
    `;

    await sendEmail({ to: email, subject, html, text });
};

/**
 * Send welcome email after successful registration
 */
export const sendWelcomeEmail = async (
    email: string,
    name: string
): Promise<void> => {
    const subject = 'Welcome to Bank of Skill!';
    
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
                .content { padding: 30px; background: #f9f9f9; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                .feature { padding: 15px; background: white; margin: 10px 0; border-radius: 6px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Welcome to Bank of Skill!</h1>
                </div>
                <div class="content">
                    <h2>Hi ${name},</h2>
                    <p>Your account has been successfully created! We're excited to have you on board.</p>
                    
                    <h3>What's Next?</h3>
                    <div class="feature">
                        <strong>✓ Explore Your Dashboard</strong>
                        <p>Discover all the features and tools available to manage your skills.</p>
                    </div>
                    <div class="feature">
                        <strong>✓ Complete Your Profile</strong>
                        <p>Add more details to help us personalize your experience.</p>
                    </div>
                    <div class="feature">
                        <strong>✓ Invite Your Team</strong>
                        <p>Collaborate with your organization members.</p>
                    </div>
                    
                    <div style="text-align: center;">
                        <a href="#" class="button">Go to Dashboard</a>
                    </div>
                    
                    <p>If you have any questions, feel free to reach out to our support team.</p>
                </div>
                <div class="footer">
                    <p>&copy; ${new Date().getFullYear()} Bank of Skill. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const text = `
        Welcome to Bank of Skill, ${name}!
        
        Your account has been successfully created!
        
        What's Next?
        - Explore Your Dashboard
        - Complete Your Profile
        - Invite Your Team
        
        If you have any questions, feel free to reach out to our support team.
    `;

    await sendEmail({ to: email, subject, html, text });
};

/**
 * Send password reset email (for future use)
 */
export const sendPasswordResetEmail = async (
    email: string,
    resetToken: string,
    name: string
): Promise<void> => {
    const subject = 'Reset Your Password - Bank of Skill';
    
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
                .content { padding: 30px; background: #f9f9f9; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Bank of Skill</h1>
                </div>
                <div class="content">
                    <h2>Reset Your Password</h2>
                    <p>Hi ${name},</p>
                    <p>We received a request to reset your password. Click the button below to create a new password:</p>
                    
                    <div style="text-align: center;">
                        <a href="#" class="button">Reset Password</a>
                    </div>
                    
                    <p><strong>This link will expire in 1 hour.</strong></p>
                    <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
                </div>
                <div class="footer">
                    <p>&copy; ${new Date().getFullYear()} Bank of Skill. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const text = `
        Reset Your Password - Bank of Skill
        
        Hi ${name},
        
        We received a request to reset your password.
        
        Reset Token: ${resetToken}
        
        This link will expire in 1 hour.
        
        If you didn't request a password reset, please ignore this email.
    `;

    await sendEmail({ to: email, subject, html, text });
};

/**
 * Send invitation email with generated password
 */
export const sendInvitationEmail = async (
    email: string,
    password: string,
    name: string,
    invitedBy: string
): Promise<void> => {
    const subject = 'You\'re Invited to Bank of Skill!';
    
    if (process.env.NODE_ENV !== 'production') {
        console.log('\n========== INVITATION EMAIL ==========');
        console.log('Email:', email);
        console.log('Temporary Password:', password);
        console.log('======================================\n');
    }
    
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
                .content { padding: 30px; background: #f9f9f9; }
                .password-box { background: white; padding: 20px; text-align: center; margin: 20px 0; border: 2px solid #4F46E5; border-radius: 8px; }
                .password { font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #4F46E5; font-family: monospace; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                .warning { background: #FEF3C7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #F59E0B; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Welcome to Bank of Skill!</h1>
                </div>
                <div class="content">
                    <h2>Hi ${name},</h2>
                    <p>You've been invited to join <strong>Bank of Skill</strong> by ${invitedBy}.</p>
                    
                    <p>Your account has been created with the following credentials:</p>
                    
                    <div style="background: white; padding: 15px; border-radius: 6px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
                    </div>
                    
                    <div class="password-box">
                        <p style="margin: 0 0 10px 0;"><strong>Temporary Password:</strong></p>
                        <div class="password">${password}</div>
                    </div>
                    
                    <div class="warning">
                        <strong>⚠️ Important:</strong> Please change this password after your first login for security purposes.
                    </div>
                    
                    <div style="text-align: center;">
                        <a href="${env.CLIENT_URL || 'http://localhost:4200'}/login" class="button">Login to Your Account</a>
                    </div>
                    
                    <p>If you have any questions, feel free to reach out to our support team.</p>
                </div>
                <div class="footer">
                    <p>&copy; ${new Date().getFullYear()} Bank of Skill. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const text = `
        Welcome to Bank of Skill!
        
        Hi ${name},
        
        You've been invited to join Bank of Skill by ${invitedBy}.
        
        Your Login Credentials:
        Email: ${email}
        Temporary Password: ${password}
        
        ⚠️ IMPORTANT: Please change this password after your first login.
        
        Login URL: ${env.CLIENT_URL || 'http://localhost:4200'}/login
        
        If you have any questions, feel free to reach out to our support team.
    `;

    await sendEmail({ to: email, subject, html, text });
};

/**
 * Send password reset notification email with new password
 */
export const sendPasswordResetNotificationEmail = async (
    email: string,
    password: string,
    name: string,
    resetBy: string
): Promise<void> => {
    const subject = 'Your Password Has Been Reset - Bank of Skill';
    
    if (process.env.NODE_ENV !== 'production') {
        console.log('\n========== PASSWORD RESET ==========');
        console.log('Email:', email);
        console.log('New Password:', password);
        console.log('====================================\n');
    }
    
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
                .content { padding: 30px; background: #f9f9f9; }
                .password-box { background: white; padding: 20px; text-align: center; margin: 20px 0; border: 2px solid #4F46E5; border-radius: 8px; }
                .password { font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #4F46E5; font-family: monospace; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                .warning { background: #FEF3C7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #F59E0B; }
                .alert { background: #FEE2E2; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #EF4444; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔐 Password Reset</h1>
                </div>
                <div class="content">
                    <h2>Hi ${name},</h2>
                    <p>Your password has been reset by ${resetBy}.</p>
                    
                    <div class="password-box">
                        <p style="margin: 0 0 10px 0;"><strong>Your New Temporary Password:</strong></p>
                        <div class="password">${password}</div>
                    </div>
                    
                    <div class="warning">
                        <strong>⚠️ Important:</strong> Please change this password after logging in for security purposes.
                    </div>
                    
                    <div class="alert">
                        <strong>🔒 Security Notice:</strong> If you didn't request this password reset, please contact your administrator immediately.
                    </div>
                    
                    <div style="text-align: center;">
                        <a href="${env.CLIENT_URL || 'http://localhost:4200'}/login" class="button">Login to Your Account</a>
                    </div>
                    
                    <p>If you have any concerns, please contact your administrator or our support team.</p>
                </div>
                <div class="footer">
                    <p>&copy; ${new Date().getFullYear()} Bank of Skill. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const text = `
        Password Reset - Bank of Skill
        
        Hi ${name},
        
        Your password has been reset by ${resetBy}.
        
        Your New Temporary Password: ${password}
        
        ⚠️ IMPORTANT: Please change this password after logging in.
        
        🔒 SECURITY NOTICE: If you didn't request this reset, contact your administrator immediately.
        
        Login URL: ${env.CLIENT_URL || 'http://localhost:4200'}/login
    `;

    await sendEmail({ to: email, subject, html, text });
};

export const emailService = {
    sendVerificationEmail,
    sendWelcomeEmail,
    sendPasswordResetEmail,
    sendInvitationEmail,
    sendPasswordResetNotificationEmail,
};
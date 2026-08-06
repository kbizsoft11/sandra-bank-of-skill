import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';
import dns from "node:dns";
import { settingsCacheService } from './settings-cache.service';

dns.setDefaultResultOrder("ipv4first");

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

/**
 * Create email transporter with current settings
 * Uses database settings if available, falls back to environment variables
 */
function createTransporter(): Transporter {
    const cachedSettings = settingsCacheService.getSync();
    
    // Prefer database settings, fall back to env variables
    const smtpHost = cachedSettings?.smtpHost || env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = cachedSettings?.smtpPort || env.SMTP_PORT || 587;
    const smtpUser = cachedSettings?.smtpUsername || env.SMTP_USER;
    const smtpPass = cachedSettings?.smtpPassword || env.SMTP_PASSWORD;
    const smtpEncryption = cachedSettings?.smtpEncryption || 'tls' as 'tls' | 'ssl';
    const fromEmail = cachedSettings?.fromEmail || env.EMAIL_FROM;

    const smtpAuth = smtpUser && smtpPass
        ? { user: smtpUser, pass: smtpPass }
        : undefined;

    const isGmail = (smtpHost || '').toLowerCase().includes('gmail');
    const isMailtrap = (smtpHost || '').toLowerCase().includes('mailtrap');

    // Determine secure flag based on encryption type and port
    // SSL (port 465): secure = true
    // TLS (port 587): secure = false (STARTTLS will be used)
    let secure = false;
    if (smtpEncryption === 'ssl' || smtpPort === 465) {
        secure = true; // SSL requires secure: true
    }

    console.log('\n🔧 ============ CREATING EMAIL TRANSPORTER ============');
    console.log('SMTP Host:', smtpHost);
    console.log('SMTP Port:', smtpPort);
    console.log('Encryption:', smtpEncryption);
    console.log('Secure (TLS/SSL):', secure);
    console.log('Username:', smtpUser ? '***' : 'NOT SET');
    console.log('Password:', smtpPass ? '***' : 'NOT SET');
    console.log('From Email:', fromEmail);
    console.log('Is Gmail:', isGmail);
    console.log('Is Mailtrap:', isMailtrap);
    console.log('Auth Object:', smtpAuth ? { user: '***', pass: '***' } : 'NO AUTH');
    console.log('Source:', cachedSettings?.smtpHost ? 'DATABASE (CACHED)' : 'ENVIRONMENT VARIABLES');
    console.log('=====================================================\n');

    const transportConfig: any = {
        host: smtpHost,
        port: smtpPort,
        secure,
        auth: smtpAuth,
        tls: {
            rejectUnauthorized: false,
        },
    };

    // Special handling for Gmail
    if (isGmail) {
        transportConfig.service = 'gmail';
        transportConfig.requireTLS = true;
    }

    const transporter = nodemailer.createTransport(transportConfig);

    return transporter;
}

let transporter = createTransporter();

/**
 * Reinitialize transporter with new settings
 * Called when system settings are updated
 */
export function reinitializeEmailTransporter(): void {
    try {
        transporter = createTransporter();
        console.log('✅ Email transporter reinitialized');
        
        transporter.verify((error) => {
            if (error) {
                console.error('⚠️ SMTP connection error after reinitialization:', error);
            } else {
                console.log('✅ SMTP server is ready to send emails');
            }
        });
    } catch (error) {
        console.error('❌ Error reinitializing email transporter:', error);
    }
}

// Initial verification
transporter.verify((error) => {
    if (error) {
        console.error('⚠️ Initial SMTP connection error:', error);
    } else {
        console.log('✅ SMTP server is ready to send emails');
    }
});

/**
 * Send email using Nodemailer
 */
export const sendEmail = async (options: EmailOptions): Promise<void> => {
    const cachedSettings = settingsCacheService.getSync();
    const fromEmail = cachedSettings?.fromEmail || env.EMAIL_FROM;

    // 🔍 LOG CREDENTIALS BEING USED
    console.log('\n📧 ============ SENDING EMAIL ============');
    console.log('Recipient:', options.to);
    console.log('Subject:', options.subject);
    console.log('From Email:', fromEmail);
    console.log('\n🔐 SMTP CREDENTIALS BEING USED:');
    console.log('Host:', cachedSettings?.smtpHost || env.SMTP_HOST || 'NOT SET');
    console.log('Port:', cachedSettings?.smtpPort || env.SMTP_PORT || 'NOT SET');
    console.log('Username:', cachedSettings?.smtpUsername || env.SMTP_USER || 'NOT SET');
    console.log('Encryption:', cachedSettings?.smtpEncryption || 'tls');
    console.log('Password Set:', !!(cachedSettings?.smtpPassword || env.SMTP_PASSWORD));
    console.log('Source:', cachedSettings?.smtpHost ? 'DATABASE' : 'ENVIRONMENT VARIABLES');
    console.log('========================================\n');

    const mailOptions = {
        from: fromEmail,
        to: options.to,
        subject: options.subject,
        text: options.text || '',
        html: options.html,
    };

    try {
        console.log('📤 Attempting to send email...');
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully!');
        console.log('Message ID:', info.messageId);
        if (process.env.NODE_ENV !== 'production') {
            console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info) || 'No preview available');
        }
    } catch (error: any) {
        console.error('\n❌ ============ EMAIL SENDING FAILED ============');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        console.error('Response Code:', error.responseCode);
        console.error('SMTP Response:', error.response);
        console.error('Full Error:', error);
        console.error('==============================================\n');
        
        // Re-throw with detailed error information
        let errorMessage = 'Email sending failed';
        
        if (error.code === 'EAUTH') {
            errorMessage = 'SMTP Authentication Failed: Invalid username or password. Please check your SMTP credentials.';
        } else if (error.code === 'ECONNREFUSED') {
            errorMessage = 'Cannot connect to SMTP server. Please check the host and port.';
        } else if (error.code === 'ETIMEDOUT') {
            errorMessage = 'Connection to SMTP server timed out. Please check your network and SMTP settings.';
        } else if (error.response) {
            errorMessage = `SMTP Error ${error.responseCode}: ${error.response}`;
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        throw new Error(errorMessage);
    }
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
                        <a href="${env.CLIENT_URL || 'http://localhost:4200'}/auth/login" class="button">Login to Your Account</a>
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
        
        Login URL: ${env.CLIENT_URL || 'http://localhost:4200'}/auth/login
        
        If you have any questions, feel free to reach out to our support team.
    `;

    await sendEmail({ to: email, subject, html, text });
};

/**
 * Send invitation email with a secure signup link and custom message template
 * The custom message can include {{INVITE_LINK}} placeholder which will be replaced with the actual link
 */
export const sendInvitationLinkEmail = async (
    email: string,
    name: string,
    invitedBy: string,
    inviteLink: string,
    customMessage?: string
): Promise<void> => {
    const subject = 'Complete your signup on Bank of Skill';

    if (process.env.NODE_ENV !== 'production') {
        console.log('\n========== INVITATION LINK EMAIL ==========');
        console.log('Email:', email);
        console.log('Invite Link:', inviteLink);
        console.log('Custom Message:', customMessage);
        console.log('========================================\n');
    }

    // Default message if no custom message provided
    const defaultMessage = `${invitedBy} has invited you to join Bank of Skill.

Please complete your account setup by clicking the link below:

{{INVITE_LINK}}

This link will expire in 7 days.`;

    // Use custom message or default
    const messageContent = customMessage || defaultMessage;

    // Replace {{INVITE_LINK}} placeholder with styled button for HTML (hidden long URL)
    const messageHtml = messageContent
        .replace(/\n/g, '<br>')
        .replace(/{{INVITE_LINK}}/g, `<div style="text-align: center; margin: 30px 0;"><a href="${inviteLink}" style="display: inline-block; padding: 14px 40px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Accept Invitation</a></div>`);

    // Replace {{INVITE_LINK}} placeholder with plain link for text version
    const messageText = messageContent.replace(/{{INVITE_LINK}}/g, inviteLink);

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
                .content { padding: 30px; background: #f9f9f9; }
                .message-content { line-height: 1.8; margin: 20px 0; word-wrap: break-word; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                .cta-button { display: inline-block; padding: 14px 40px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; margin: 20px 0; }
                .cta-button:hover { background: #3F36D5; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 You're invited to Bank of Skill</h1>
                </div>
                <div class="content">
                    <h2>Hi ${name},</h2>
                    <div class="message-content">
                        ${messageHtml}
                    </div>
                </div>
                <div class="footer">
                    <p>&copy; ${new Date().getFullYear()} Bank of Skill. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const text = `
        Complete your signup on Bank of Skill

        Hi ${name},

        ${messageText}

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
                        <a href="${env.CLIENT_URL || 'http://localhost:4200'}/auth/login" class="button">Login to Your Account</a>
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
        Your Password Has Been Reset - Bank of Skill
        
        Hi ${name},
        
        Your password has been reset by ${resetBy}.
        
        Your New Temporary Password: ${password}
        
        ⚠️ IMPORTANT: Please change this password after logged in.
        
        🔒 SECURITY NOTICE: If you didn't request this password reset, please contact your administrator immediately.
        
        Login URL: ${env.CLIENT_URL || 'http://localhost:4200'}/auth/login
    `;

    await sendEmail({ to: email, subject, html, text });
};


/**
 * Send OTP verification email
 */
export const sendVerificationEmail = async (
    email: string,
    otp: string,
    name: string
): Promise<void> => {
    const subject = 'Verify Your Email - Bank of Skill';

    if (process.env.NODE_ENV !== 'production') {
        console.log('\n========== DEV OTP CODE ==========');
        console.log('Email:', email);
        console.log('OTP:', otp);
        console.log('==================================\n');
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
                        <a href="${env.CLIENT_URL || 'http://localhost:4200'}/dashboard" class="button">Go to Dashboard</a>
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

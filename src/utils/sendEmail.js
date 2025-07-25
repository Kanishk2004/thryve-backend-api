import Nodemailer from 'nodemailer';
import { MailtrapTransport } from 'mailtrap';

const TOKEN = process.env.MAILTRAP_TOKEN;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://nexwebstudios.in';

// Validate environment variables
if (!TOKEN) {
	throw new Error('MAILTRAP_TOKEN environment variable is required');
}

const transport = Nodemailer.createTransport(
	MailtrapTransport({
		token: TOKEN,
	})
);

const sender = {
	address: 'auth@nexwebstudios.in',
	name: 'Thryve - Authentication',
};

export const sendEmail = async (reciverEmail, jwtToken) => {
	// Validate parameters
	if (!reciverEmail || !jwtToken) {
		throw new Error('Email address and JWT token are required');
	}

	// Basic email validation
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(reciverEmail)) {
		throw new Error('Invalid email address format');
	}
	const htmlTemplate = `
	<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>Email Verification - Thryve</title>
		<style>
			* {
				margin: 0;
				padding: 0;
				box-sizing: border-box;
			}
			
			body {
				font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
				background-color: #f8fafc;
				color: #334155;
				line-height: 1.6;
			}
			
			.email-container {
				max-width: 600px;
				margin: 0 auto;
				background-color: #ffffff;
				border-radius: 12px;
				overflow: hidden;
				box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
			}
			
			.header {
				background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
				padding: 40px 20px;
				text-align: center;
				color: white;
			}
			
			.logo {
				font-size: 32px;
				font-weight: bold;
				margin-bottom: 10px;
				letter-spacing: 2px;
			}
			
			.tagline {
				font-size: 16px;
				opacity: 0.9;
			}
			
			.content {
				padding: 40px 30px;
			}
			
			.greeting {
				font-size: 24px;
				font-weight: 600;
				color: #1e293b;
				margin-bottom: 20px;
			}
			
			.message {
				font-size: 16px;
				color: #64748b;
				margin-bottom: 30px;
				line-height: 1.7;
			}
			
			.verify-button {
				display: inline-block;
				background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
				color: white;
				text-decoration: none;
				padding: 16px 32px;
				border-radius: 8px;
				font-weight: 600;
				font-size: 16px;
				text-align: center;
				transition: transform 0.2s ease;
				box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
			}
			
			.verify-button:hover {
				transform: translateY(-2px);
			}
			
			.button-container {
				text-align: center;
				margin: 30px 0;
			}
			
			.security-note {
				background-color: #f1f5f9;
				border-left: 4px solid #3b82f6;
				padding: 20px;
				margin: 30px 0;
				border-radius: 4px;
			}
			
			.security-title {
				font-weight: 600;
				color: #1e293b;
				margin-bottom: 8px;
			}
			
			.security-text {
				font-size: 14px;
				color: #64748b;
			}
			
			.footer {
				background-color: #f8fafc;
				padding: 30px;
				text-align: center;
				border-top: 1px solid #e2e8f0;
			}
			
			.footer-text {
				font-size: 14px;
				color: #94a3b8;
				margin-bottom: 10px;
			}
			
			.social-links {
				margin-top: 20px;
			}
			
			.social-link {
				display: inline-block;
				margin: 0 10px;
				color: #667eea;
				text-decoration: none;
				font-weight: 500;
			}
			
			.divider {
				height: 1px;
				background: linear-gradient(to right, transparent, #e2e8f0, transparent);
				margin: 30px 0;
			}
			
			@media (max-width: 600px) {
				.email-container {
					margin: 10px;
					border-radius: 8px;
				}
				
				.content {
					padding: 30px 20px;
				}
				
				.greeting {
					font-size: 20px;
				}
				
				.verify-button {
					padding: 14px 28px;
					font-size: 14px;
				}
			}
		</style>
	</head>
	<body>
		<div class="email-container">
			<!-- Header -->
			<div class="header">
				<div class="logo">THRYVE</div>
				<div class="tagline">Your Journey to Wellness Starts Here</div>
			</div>
			
			<!-- Content -->
			<div class="content">
				<div class="greeting">Welcome to Thryve! 🎉</div>
				
				<div class="message">
					Thank you for joining our community! We're excited to have you on board. 
					To get started and secure your account, please verify your email address by clicking the button below.
				</div>
				
				<div class="button-container">
					<a href="${FRONTEND_URL}/verify-email?token=${jwtToken}" class="verify-button">
						Verify Email Address
					</a>
				</div>
				
				<div class="divider"></div>
				
				<div class="security-note">
					<div class="security-title">🔒 Security Note</div>
					<div class="security-text">
						This verification link will expire in 24 hours for your security. 
						If you didn't create an account with Thryve, please ignore this email.
					</div>
				</div>
				
				<div class="message">
					If the button above doesn't work, you can copy and paste this link into your browser:
					<br><br>
					<a href="${FRONTEND_URL}/verify-email?token=${jwtToken}" style="color: #667eea; word-break: break-all;">
						${FRONTEND_URL}/verify-email?token=${jwtToken}
					</a>
				</div>
			</div>
			
			<!-- Footer -->
			<div class="footer">
				<div class="footer-text">
					© 2025 Thryve. All rights reserved.
				</div>
				<div class="footer-text">
					Need help? Contact us at <a href="mailto:support@nexwebstudios.in" style="color: #667eea;">support@nexwebstudios.in</a>
				</div>
				
				<div class="social-links">
					<a href="#" class="social-link">Privacy Policy</a>
					<a href="#" class="social-link">Terms of Service</a>
					<a href="#" class="social-link">Unsubscribe</a>
				</div>
			</div>
		</div>
	</body>
	</html>
	`;

	try {
		const result = await transport.sendMail({
			from: sender,
			to: reciverEmail,
			subject: '🎉 Welcome to Thryve - Verify Your Email',
			text: `Welcome to Thryve! Please verify your email by clicking on the following link: ${FRONTEND_URL}/verify-email?token=${jwtToken}`,
			html: htmlTemplate,
			category: 'Email Verification',
		});

		console.log('Email sent successfully to: ' + reciverEmail);
		return {
			success: true,
			messageId: result.messageId,
			message: 'Verification email sent successfully',
		};
	} catch (error) {
		console.error('Error sending email:', error);
		throw new Error(`Failed to send verification email: ${error.message}`);
	}
};

export const sendPasswordResetEmail = async (reciverEmail, resetToken) => {
	// Validate parameters
	if (!reciverEmail || !resetToken) {
		throw new Error('Email address and reset token are required');
	}

	// Basic email validation
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(reciverEmail)) {
		throw new Error('Invalid email address format');
	}

	const htmlTemplate = `
	<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>Password Reset - Thryve</title>
		<style>
			* {
				margin: 0;
				padding: 0;
				box-sizing: border-box;
			}
			
			body {
				font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
				background-color: #f8fafc;
				color: #334155;
				line-height: 1.6;
			}
			
			.email-container {
				max-width: 600px;
				margin: 0 auto;
				background-color: #ffffff;
				border-radius: 12px;
				overflow: hidden;
				box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
			}
			
			.header {
				background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
				padding: 40px 20px;
				text-align: center;
				color: white;
			}
			
			.logo {
				font-size: 32px;
				font-weight: bold;
				margin-bottom: 10px;
				letter-spacing: 2px;
			}
			
			.tagline {
				font-size: 16px;
				opacity: 0.9;
			}
			
			.content {
				padding: 40px 30px;
			}
			
			.greeting {
				font-size: 24px;
				font-weight: 600;
				color: #1e293b;
				margin-bottom: 20px;
			}
			
			.message {
				font-size: 16px;
				color: #64748b;
				margin-bottom: 30px;
				line-height: 1.7;
			}
			
			.reset-button {
				display: inline-block;
				background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
				color: white;
				text-decoration: none;
				padding: 16px 32px;
				border-radius: 8px;
				font-weight: 600;
				font-size: 16px;
				text-align: center;
				transition: transform 0.2s ease;
				box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
			}
			
			.reset-button:hover {
				transform: translateY(-2px);
			}
			
			.button-container {
				text-align: center;
				margin: 30px 0;
			}
			
			.security-note {
				background-color: #fef2f2;
				border-left: 4px solid #ef4444;
				padding: 20px;
				margin: 30px 0;
				border-radius: 4px;
			}
			
			.security-title {
				font-weight: 600;
				color: #991b1b;
				margin-bottom: 8px;
			}
			
			.security-text {
				font-size: 14px;
				color: #7f1d1d;
			}
			
			.warning-note {
				background-color: #fffbeb;
				border-left: 4px solid #f59e0b;
				padding: 20px;
				margin: 30px 0;
				border-radius: 4px;
			}
			
			.warning-title {
				font-weight: 600;
				color: #92400e;
				margin-bottom: 8px;
			}
			
			.warning-text {
				font-size: 14px;
				color: #78350f;
			}
			
			.footer {
				background-color: #f8fafc;
				padding: 30px;
				text-align: center;
				border-top: 1px solid #e2e8f0;
			}
			
			.footer-text {
				font-size: 14px;
				color: #94a3b8;
				margin-bottom: 10px;
			}
			
			.social-links {
				margin-top: 20px;
			}
			
			.social-link {
				display: inline-block;
				margin: 0 10px;
				color: #667eea;
				text-decoration: none;
				font-weight: 500;
			}
			
			.divider {
				height: 1px;
				background: linear-gradient(to right, transparent, #e2e8f0, transparent);
				margin: 30px 0;
			}
			
			@media (max-width: 600px) {
				.email-container {
					margin: 10px;
					border-radius: 8px;
				}
				
				.content {
					padding: 30px 20px;
				}
				
				.greeting {
					font-size: 20px;
				}
				
				.reset-button {
					padding: 14px 28px;
					font-size: 14px;
				}
			}
		</style>
	</head>
	<body>
		<div class="email-container">
			<!-- Header -->
			<div class="header">
				<div class="logo">THRYVE</div>
				<div class="tagline">Password Reset Request</div>
			</div>
			
			<!-- Content -->
			<div class="content">
				<div class="greeting">Reset Your Password 🔒</div>
				
				<div class="message">
					We received a request to reset your password for your Thryve account. 
					If you made this request, click the button below to set a new password.
				</div>
				
				<div class="button-container">
					<a href="${FRONTEND_URL}/reset-password?token=${resetToken}" class="reset-button">
						Reset Password
					</a>
				</div>
				
				<div class="divider"></div>
				
				<div class="security-note">
					<div class="security-title">🔒 Security Information</div>
					<div class="security-text">
						This password reset link will expire in 1 hour for your security. 
						You can only use this link once to reset your password.
					</div>
				</div>
				
				<div class="warning-note">
					<div class="warning-title">⚠️ Important</div>
					<div class="warning-text">
						If you didn't request a password reset, please ignore this email. 
						Your password will remain unchanged. Consider changing your password if you suspect unauthorized access.
					</div>
				</div>
				
				<div class="message">
					If the button above doesn't work, you can copy and paste this link into your browser:
					<br><br>
					<a href="${FRONTEND_URL}/reset-password?token=${resetToken}" style="color: #ef4444; word-break: break-all;">
						${FRONTEND_URL}/reset-password?token=${resetToken}
					</a>
				</div>
			</div>
			
			<!-- Footer -->
			<div class="footer">
				<div class="footer-text">
					© 2025 Thryve. All rights reserved.
				</div>
				<div class="footer-text">
					Need help? Contact us at <a href="mailto:support@nexwebstudios.in" style="color: #667eea;">support@nexwebstudios.in</a>
				</div>
				
				<div class="social-links">
					<a href="#" class="social-link">Privacy Policy</a>
					<a href="#" class="social-link">Terms of Service</a>
					<a href="#" class="social-link">Unsubscribe</a>
				</div>
			</div>
		</div>
	</body>
	</html>
	`;

	try {
		const result = await transport.sendMail({
			from: sender,
			to: reciverEmail,
			subject: '🔒 Reset Your Thryve Password',
			text: `You requested a password reset for your Thryve account. Click the following link to reset your password: ${FRONTEND_URL}/reset-password?token=${resetToken} This link will expire in 1 hour.`,
			html: htmlTemplate,
			category: 'Password Reset',
		});

		console.log('Password reset email sent successfully to: ' + reciverEmail);
		return {
			success: true,
			messageId: result.messageId,
			message: 'Password reset email sent successfully',
		};
	} catch (error) {
		console.error('Error sending password reset email:', error);
		throw new Error(`Failed to send password reset email: ${error.message}`);
	}
};

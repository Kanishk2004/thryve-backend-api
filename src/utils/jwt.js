import jwt from 'jsonwebtoken';

const AccessTokenExpiry = '15m';
const RefreshTokenExpiry = '7d';

// Generate access token and refresh token
const generateAccessToken = (user) => {
	const AccessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
	if (!AccessTokenSecret) {
		throw new Error('ACCESS_TOKEN_SECRET is not configured');
	}
	return jwt.sign({ id: user.id, email: user.email }, AccessTokenSecret, {
		expiresIn: AccessTokenExpiry,
	});
};
const verifyToken = (token) => {
	try {
		const AccessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
		return jwt.verify(token, AccessTokenSecret);
	} catch (error) {
		return null;
	}
};

const generateRefreshToken = (user) => {
	const RefreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
	if (!RefreshTokenSecret) {
		throw new Error('REFRESH_TOKEN_SECRET is not configured');
	}
	return jwt.sign({ id: user.id, email: user.email }, RefreshTokenSecret, {
		expiresIn: RefreshTokenExpiry,
	});
};
const verifyRefreshToken = (token) => {
	try {
		const RefreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
		return jwt.verify(token, RefreshTokenSecret);
	} catch (error) {
		return null;
	}
};

const emailVerificationToken = (user) => {
	const EmailVerificationSecret = process.env.EMAIL_VERIFICATION_SECRET;
	return jwt.sign({ id: user.id, email: user.email }, EmailVerificationSecret, {
		expiresIn: '6h',
	});
};
const verifyEmailToken = (token) => {
	try {
		const EmailVerificationSecret = process.env.EMAIL_VERIFICATION_SECRET;
		return jwt.verify(token, EmailVerificationSecret);
	} catch (error) {
		return null;
	}
};

const resetPasswordToken = (user) => {
	const ResetPasswordSecret = process.env.RESET_PASSWORD_SECRET;
	return jwt.sign({ id: user.id, email: user.email }, ResetPasswordSecret, {
		expiresIn: '1h',
	});
};
const verifyResetPasswordToken = (token) => {
	try {
		const ResetPasswordSecret = process.env.RESET_PASSWORD_SECRET;
		return jwt.verify(token, ResetPasswordSecret);
	} catch (error) {
		return null;
	}
};

export {
	generateAccessToken,
	generateRefreshToken,
	verifyToken,
	verifyRefreshToken,
	emailVerificationToken,
	verifyEmailToken,
	resetPasswordToken,
	verifyResetPasswordToken,
};

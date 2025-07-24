import jwt from 'jsonwebtoken';

const AccessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
const RefreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
const EmailVerificationSecret = process.env.EMAIL_VERIFICATION_SECRET;
const AccessTokenExpiry = '15m';
const RefreshTokenExpiry = '7d';

// Generate access token and refresh token
const generateAccessToken = (user) => {
	return jwt.sign({ id: user.id, email: user.email }, AccessTokenSecret, {
		expiresIn: AccessTokenExpiry,
	});
};

const generateRefreshToken = (user) => {
	return jwt.sign({ id: user.id, email: user.email }, RefreshTokenSecret, {
		expiresIn: RefreshTokenExpiry,
	});
};

const emailVerificationToken = (user) => {
	return jwt.sign({ id: user.id, email: user.email }, EmailVerificationSecret, {
		expiresIn: '6h',
	});
};

const verifyEmailToken = (token) => {
	try {
		return jwt.verify(token, EmailVerificationSecret);
	} catch (error) {
		return null;
	}
};

const verifyToken = (token) => {
	try {
		return jwt.verify(token, AccessTokenSecret);
	} catch (error) {
		return null;
	}
};

const verifyRefreshToken = (token) => {
	try {
		return jwt.verify(token, RefreshTokenSecret);
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
};

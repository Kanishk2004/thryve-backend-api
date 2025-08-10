# 🔐 Authentication & Authorization System Documentation

## ✅ **Complete Authentication Implementation**

Thryve's authentication system provides secure, scalable user management with JWT-based authentication, role-based access control, and comprehensive email verification.

### **🏗️ Core Authentication Infrastructure**

#### **1. JWT Token Management**
- ✅ **Access Tokens** - Short-lived (15 minutes) for API authentication
- ✅ **Refresh Tokens** - Long-lived (7 days) with automatic rotation
- ✅ **Token Blacklisting** - Secure logout with token invalidation
- ✅ **Auto-Refresh** - Seamless token renewal without user intervention
- ✅ **Secure Storage** - HTTP-only cookies for refresh tokens

#### **2. User Registration & Verification**
- ✅ **Email-based Registration** with password strength validation
- ✅ **OTP Email Verification** with time-based expiration (10 minutes)
- ✅ **Anonymous User Support** for privacy-focused interactions
- ✅ **Username Uniqueness** validation and availability checking
- ✅ **Profile Setup** - Optional demographic and health information

#### **3. Password Security**
- ✅ **bcryptjs Hashing** with salt rounds for password protection
- ✅ **Password Reset Flow** with secure OTP verification
- ✅ **Password Strength Requirements** enforced on frontend/backend
- ✅ **Forgot Password** with email-based reset tokens
- ✅ **Password Change** with current password verification

#### **4. Role-Based Access Control (RBAC)**
- ✅ **User Roles**: `USER`, `ADMIN`, `DOCTOR`, `MENTOR`
- ✅ **Hierarchical Permissions** with role inheritance
- ✅ **Route Protection** middleware for different access levels
- ✅ **Admin Panel Access** restricted to admin users
- ✅ **Doctor Verification** system for healthcare providers

### **📡 Authentication API Endpoints**

```bash
# User Registration & Login
POST   /api/v1/auth/register           # Create new user account
POST   /api/v1/auth/login              # User login with credentials
POST   /api/v1/auth/logout             # Secure logout with token cleanup
POST   /api/v1/auth/refresh            # Refresh access token

# Email Verification
POST   /api/v1/auth/verify-email       # Verify email with OTP
POST   /api/v1/auth/resend-otp         # Resend verification OTP

# Password Management
POST   /api/v1/auth/forgot-password    # Request password reset
POST   /api/v1/auth/reset-password     # Reset password with OTP
POST   /api/v1/auth/change-password    # Change password (authenticated)

# Account Management
POST   /api/v1/auth/check-username     # Check username availability
GET    /api/v1/auth/profile            # Get current user info
```

### **🔐 Security Features Implemented**

#### **1. JWT Security**
```javascript
// Access Token (15 minutes)
{
  "id": "user-id",
  "email": "user@example.com", 
  "role": "USER",
  "isEmailVerified": true,
  "exp": 1642678800
}

// Refresh Token (7 days) 
{
  "id": "user-id",
  "tokenVersion": 1,
  "exp": 1643283600
}
```

#### **2. Password Requirements**
- ✅ **Minimum 8 characters** length
- ✅ **Mixed case** letters (A-z)
- ✅ **Numbers and symbols** required
- ✅ **Common password** dictionary checking
- ✅ **bcrypt hashing** with 12 salt rounds

#### **3. Rate Limiting & Protection**
- ✅ **Login attempt limiting** (5 attempts per 15 minutes)
- ✅ **OTP request throttling** (1 per minute)
- ✅ **IP-based rate limiting** for registration
- ✅ **CORS protection** with whitelist origins
- ✅ **XSS protection** via input sanitization

#### **4. Session Management**
- ✅ **Automatic token refresh** before expiration
- ✅ **Secure logout** on all devices
- ✅ **Session hijacking protection** with token rotation
- ✅ **Device fingerprinting** for suspicious activity detection
- ✅ **Concurrent session limits** (configurable)

### **🔄 Authentication Flow Examples**

#### **1. User Registration Flow**
```javascript
// Step 1: Register
POST /api/v1/auth/register
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "fullName": "John Doe",
  "username": "johndoe"
}

// Response: User created, verification email sent
{
  "success": true,
  "data": {
    "userId": "cm1a2b3c4d5e6f",
    "email": "user@example.com",
    "isEmailVerified": false
  },
  "message": "User registered successfully. Please verify your email."
}

// Step 2: Verify Email
POST /api/v1/auth/verify-email
{
  "email": "user@example.com",
  "otp": "123456"
}

// Response: Email verified, access granted
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "cm1a2b3c4d5e6f",
      "email": "user@example.com",
      "isEmailVerified": true
    }
  },
  "message": "Email verified successfully"
}
```

#### **2. Login Flow**
```javascript
// Login Request
POST /api/v1/auth/login
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

// Success Response
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "cm1a2b3c4d5e6f",
      "email": "user@example.com",
      "username": "johndoe",
      "fullName": "John Doe",
      "role": "USER",
      "isEmailVerified": true
    }
  },
  "message": "Login successful"
}
```

#### **3. Token Refresh Flow**
```javascript
// Automatic refresh (before access token expires)
POST /api/v1/auth/refresh
// Uses refresh token from HTTP-only cookie

// Response with new tokens
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "cm1a2b3c4d5e6f",
      "email": "user@example.com"
    }
  },
  "message": "Token refreshed successfully"
}
```

### **🛡️ Middleware Implementation**

#### **1. Authentication Middleware**
```javascript
// Verify JWT access token
import { authenticateToken } from '../middlewares/auth.js';

// Usage in routes
router.get('/protected', authenticateToken, handler);

// Adds req.user with decoded token data
```

#### **2. Role-Based Authorization**
```javascript
// Admin-only routes
import { requireAdmin } from '../middlewares/roleAuth.js';
router.get('/admin-only', authenticateToken, requireAdmin, handler);

// Doctor verification required
import { requireDoctor } from '../middlewares/roleAuth.js';
router.get('/doctor-only', authenticateToken, requireDoctor, handler);
```

#### **3. Email Verification Check**
```javascript
// Require verified email
import { requireVerification } from '../middlewares/auth.js';
router.post('/verified-only', authenticateToken, requireVerification, handler);
```

### **📧 Email Integration**

#### **1. OTP System**
- ✅ **6-digit numeric codes** for easy user input
- ✅ **10-minute expiration** for security
- ✅ **Rate limiting** - 1 OTP per minute per email
- ✅ **Automatic cleanup** of expired OTPs
- ✅ **Resend functionality** with cooldown

#### **2. Email Templates**
- ✅ **Welcome emails** with verification links
- ✅ **Password reset** emails with secure tokens
- ✅ **Account security** notifications
- ✅ **HTML and text** versions for compatibility
- ✅ **Branded templates** with Thryve styling

#### **3. Email Service Integration**
```javascript
// Nodemailer with Mailtrap (development)
// SendGrid/SES ready for production

const emailConfig = {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
};
```

### **🧪 Testing Authentication**

#### **1. Manual Testing with Postman**
```bash
# Test registration
curl -X POST http://localhost:51214/api/v1/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "fullName": "Test User"
  }'

# Test login
curl -X POST http://localhost:51214/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "test@example.com", 
    "password": "TestPass123!"
  }'
```

#### **2. Frontend Integration Example**
```javascript
// Axios interceptor for automatic token refresh
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        await axios.post('/api/v1/auth/refresh');
        return axios.request(error.config);
      } catch (refreshError) {
        // Redirect to login
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

### **🎯 Authentication Best Practices**

#### **1. Security Recommendations**
- ✅ **HTTPS only** in production
- ✅ **Secure cookie flags** (HttpOnly, Secure, SameSite)
- ✅ **Environment variables** for secrets
- ✅ **Regular token rotation** 
- ✅ **Audit logging** for auth events

#### **2. User Experience**
- ✅ **Clear error messages** without exposing security details
- ✅ **Progressive enhancement** (work without JS)
- ✅ **Accessibility** for screen readers
- ✅ **Mobile-friendly** OTP input
- ✅ **Remember me** functionality

#### **3. Scalability Features**
- ✅ **Stateless authentication** with JWT
- ✅ **Database indexing** on email/username
- ✅ **Connection pooling** for high load
- ✅ **Caching strategy** for user sessions
- ✅ **Horizontal scaling** ready

### **🚀 Production Readiness**

✅ **Secure JWT implementation** with proper expiration  
✅ **Email verification** with OTP system  
✅ **Password reset** functionality  
✅ **Role-based access control**  
✅ **Rate limiting** and abuse prevention  
✅ **Error handling** and logging  
✅ **Database optimization** with proper indexing  
✅ **Email integration** ready for production  
✅ **Frontend integration** patterns established  
✅ **Security best practices** implemented  

### **📈 Future Enhancements**

#### **Phase 2: Advanced Security**
1. **Two-Factor Authentication (2FA)** with TOTP
2. **OAuth Integration** (Google, Apple, Facebook)
3. **Device Management** - trusted devices
4. **Advanced Rate Limiting** with Redis
5. **Audit Logging** with detailed tracking

#### **Phase 3: Enterprise Features**
1. **Single Sign-On (SSO)** integration
2. **Advanced Role Management** with custom permissions
3. **Multi-tenant Architecture** support
4. **Compliance Features** (GDPR, HIPAA)
5. **Advanced Analytics** for auth patterns

Your authentication system provides a **solid foundation** for all other Thryve features and is ready to scale with your growing user base! 🔐

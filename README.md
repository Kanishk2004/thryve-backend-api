# 🌟 Thryve - Backend API

> **⚠️ Project Status: In Active Development**
> 
> This project is currently under active development. Some features are fully implemented and operational, while others are planned for future releases. See the feature status below for detailed information.

Thryve is a comprehensive chronic illness community platform designed to empower individuals navigating health challenges like Type 1 Diabetes, Thalassemia, mental health conditions, and more. Our backend API provides secure, scalable infrastructure for building meaningful connections between users, healthcare professionals, and support communities.

---

## 🚀 Tech Stack

- **Runtime:** Node.js with Express.js
- **Database:** PostgreSQL (hosted on [Neon](https://neon.tech/))
- **ORM:** Prisma with custom client generation
- **Authentication:** JWT with refresh token rotation
- **Real-time Communication:** Socket.IO for WebSocket connections
- **File Storage:** Cloudinary for media uploads
- **Email Service:** Nodemailer with Mailtrap
- **API Documentation:** Swagger/OpenAPI 3.0
- **Development:** Nodemon for hot reloading

---

## 📁 Project Architecture

```
thryve-backend/
├── 📁 src/
│   ├── 📁 controllers/          # Route handlers organized by feature
│   │   ├── 📁 auth/            # Authentication & authorization
│   │   ├── 📁 users/           # User management, profiles, matching
│   │   ├── 📁 chat/            # Real-time messaging and chat management
│   │   ├── 📁 admin/           # Admin dashboard functionality
│   │   └── 📁 illnesses/       # Health condition management
│   ├── 📁 routes/              # API route definitions
│   ├── 📁 middlewares/         # Authentication, validation, file upload
│   ├── 📁 services/            # Business logic layer
│   ├── 📁 socket/              # Socket.IO server and event handlers
│   ├── 📁 utils/               # Helper functions and utilities
│   └── 📁 generated/           # Auto-generated Prisma client
├── 📁 prisma/                  # Database schema and migrations
│   ├── schema.prisma           # Main database schema
│   ├── 📁 migrations/          # Database migration history
│   └── seed.js                 # Database seeding scripts
├── 📁 docs/                    # Additional API documentation
├── 📁 public/                  # Static assets
├── swagger.yaml                # Complete API documentation
└── package.json
```

---

## 🏁 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL database
- Cloudinary account (for image uploads)
- Email service (Mailtrap for development)

### 1. Clone the Repository
```bash
git clone https://github.com/Kanishk2004/thryve-backend-api.git
cd thryve-backend-api
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory:
```env
# Database
DATABASE_URL="postgresql://username:password@host:port/database"

# JWT Configuration
JWT_SECRET="your-super-secure-jwt-secret"
JWT_ACCESS_TOKEN_EXPIRY="15m"
JWT_REFRESH_TOKEN_EXPIRY="7d"

# Cloudinary (Image Uploads)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Email Service
EMAIL_USER="your-email@domain.com"
EMAIL_PASS="your-email-password"
SMTP_HOST="smtp.mailtrap.io"
SMTP_PORT=2525

# Server Configuration
PORT=51214
NODE_ENV="development"
```

### 4. Database Setup
```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed the database with sample data
npm run db:seed

# (Optional) Add test users for development
npm run db:seed:test-users
```

### 5. Start the Development Server
```bash
# Start with hot reloading
npm run dev

# Or start production server
npm start
```

The API will be available at `http://localhost:51214/api/v1`

---

## ✅ Implemented Features

### 🔐 Authentication & Authorization
- ✅ **JWT Authentication** with access/refresh token rotation
- ✅ **Email Verification** with OTP system
- ✅ **Password Reset** functionality
- ✅ **Role-based Access Control** (USER, ADMIN, DOCTOR, MENTOR)
- ✅ **Anonymous User Support** for privacy-focused interactions
- ✅ **Session Management** with automatic token refresh

### 👥 User Management
- ✅ **Complete User Profiles** with avatar uploads
- ✅ **User Preferences** system for matching
- ✅ **Illness Tracking** and condition preferences
- ✅ **User Search** and discovery
- ✅ **Privacy Controls** (age sharing, illness visibility)
- ✅ **Account Status** management (active/inactive)

### 🏥 Health & Illness Management
- ✅ **Illness Database** with categories and descriptions
- ✅ **User-Illness Associations** with severity tracking
- ✅ **Diagnosis Year** and condition details
- ✅ **Support Preferences** (seeking/offering help)

### 🎯 Matching System
- ✅ **Smart User Matching** based on:
  - Shared health conditions
  - Age compatibility
  - Gender preferences
  - Support needs alignment
- ✅ **Compatibility Scoring** algorithm
- ✅ **Advanced Filtering** options
- ✅ **Pagination** for large result sets

### 💬 Real-Time Chat System
- ✅ **Socket.IO Integration** with JWT authentication
- ✅ **Direct Messaging** between matched users
- ✅ **Group Chat Support** with role management (Admin, Moderator, Member)
- ✅ **Message Types** - Text, images, files, voice notes, system messages
- ✅ **Real-Time Features**:
  - Live message delivery and read receipts
  - Typing indicators with smart timeouts
  - Online/offline presence tracking
  - User activity status
- ✅ **Message Management**:
  - Edit messages (15-minute window)
  - Delete messages (with proper permissions)
  - Reply to messages (threaded conversations)
  - Search within chat history
- ✅ **Advanced Chat Features**:
  - Message pagination for large histories
  - Unread message counting
  - Chat session management
  - Automatic delivery confirmations

### 🛡️ Admin Dashboard
- ✅ **User Management** (view, activate, deactivate)
- ✅ **Account Verification** controls
- ✅ **Admin Action Logging** for audit trails
- ✅ **Test User Management** for development
- ✅ **System User** middleware for automated actions

### 📱 API Infrastructure
- ✅ **Comprehensive API Documentation** (Swagger/OpenAPI)
- ✅ **Error Handling** with standardized responses
- ✅ **Input Validation** and sanitization
- ✅ **CORS Configuration** for web clients
- ✅ **File Upload** support with Cloudinary integration
- ✅ **Health Check** endpoints

---

## 🚧 Upcoming Features

### 💬 Community & Communication
- 🔄 **Community Posts** system (in development)
- 🔄 **Comment Threads** with nested replies
- 📅 **Group Discussions** for condition-specific communities
- 📅 **Anonymous Posting** options
- 📅 **File Upload in Chats** - Enhanced media sharing
- 📅 **Voice Messages** - Audio recording and playback
- 📅 **Message Encryption** - End-to-end security

### 🩺 Healthcare Integration
- 📅 **Doctor Profiles** and verification system
- 📅 **Appointment Booking** with calendar integration
- 📅 **Payment Processing** via Stripe
- 📅 **Consultation Notes** and follow-ups
- 📅 **Medical Document** uploads and AI analysis

### 📊 Personal Health Tracking
- 📅 **Mood Journals** with privacy controls
- 📅 **Symptom Tracking** and patterns
- 📅 **Medication Reminders**
- 📅 **Health Progress** visualization

### 🔔 Notifications & Engagement
- 📅 **In-app Notifications** system
- 📅 **Email Notifications** for important events
- 📅 **Push Notifications** for mobile apps
- 📅 **Community Activity** feeds

### 🤖 AI & Intelligence
- 📅 **AI Chat Moderation** for safety
- 📅 **Content Recommendations** based on interests
- 📅 **Health Insights** from user data
- 📅 **Smart Matching** improvements

### 🔧 Platform Enhancements
- 📅 **Rate Limiting** and abuse prevention
- 📅 **Content Moderation** tools
- 📅 **Analytics Dashboard** for admins
- 📅 **API Rate Limiting** and quotas
- 📅 **Comprehensive Testing** suite

---

## 📋 Available Scripts

```bash
# Development
npm run dev              # Start development server with hot reload
npm start               # Start production server

# Database Management
npm run db:seed         # Seed database with initial data
npm run db:seed:test-users  # Add test users for development
npm run db:reset        # Reset database and re-seed
npm run test-users      # Run test user scripts

# Maintenance
npx prisma generate     # Regenerate Prisma client
npx prisma migrate dev  # Create and apply new migration
npx prisma studio      # Open Prisma Studio (database GUI)
```

---

## 📖 API Documentation

### Interactive Documentation
- **Swagger UI:** Available at `/api-docs` when server is running
- **Complete API Reference:** See `swagger.yaml` file
- **Matching API Guide:** `docs/MATCHING_API.md`
- **Chat System Guide:** `docs/CHAT_SYSTEM_DESIGN.md`
- **Chat Implementation Status:** `docs/CHAT_IMPLEMENTATION_STATUS.md`
- **Test Users Guide:** `docs/TEST_USERS_GUIDE.md`

### Key API Endpoints
```
🔐 Authentication
POST   /api/v1/auth/register          # User registration
POST   /api/v1/auth/login             # User login
POST   /api/v1/auth/refresh           # Refresh access token
POST   /api/v1/auth/logout            # User logout
POST   /api/v1/auth/verify-email      # Email verification
POST   /api/v1/auth/forgot-password   # Password reset request
POST   /api/v1/auth/reset-password    # Password reset confirmation

👥 User Management
GET    /api/v1/user/profile           # Get user profile
PUT    /api/v1/user/profile           # Update user profile
POST   /api/v1/user/avatar            # Upload user avatar
GET    /api/v1/user/preferences       # Get user preferences
PUT    /api/v1/user/preferences       # Update user preferences
GET    /api/v1/user/matches           # Find compatible users
GET    /api/v1/user/search            # Search users

💬 Real-Time Chat
GET    /api/v1/chat/sessions          # Get user's chat sessions
POST   /api/v1/chat/sessions          # Create new chat session
GET    /api/v1/chat/sessions/:id      # Get specific chat details
PUT    /api/v1/chat/sessions/:id      # Update chat session (groups)
DELETE /api/v1/chat/sessions/:id      # Delete/leave chat session
GET    /api/v1/chat/sessions/:id/messages  # Get message history
POST   /api/v1/chat/sessions/:id/messages  # Send message (HTTP fallback)
PUT    /api/v1/chat/messages/:id      # Edit message
DELETE /api/v1/chat/messages/:id      # Delete message
POST   /api/v1/chat/sessions/:id/read # Mark messages as read
GET    /api/v1/chat/sessions/:id/unread    # Get unread count
GET    /api/v1/chat/sessions/:id/search    # Search messages

🏥 Health Management
GET    /api/v1/illnesses             # List all illnesses
GET    /api/v1/illnesses/categories  # Get illness categories

🛡️ Admin (Admin/System users only)
GET    /api/v1/admin/users           # List all users
PUT    /api/v1/admin/users/:id       # Update user details
POST   /api/v1/admin/test-users      # Create test users

🔍 System
GET    /api/v1/healthcheck           # API health status
```

---

## 🧪 Testing

Currently implementing a comprehensive testing strategy:
- **Unit Tests:** Service layer and utility functions
- **Integration Tests:** API endpoints and database operations
- **API Testing:** Automated testing with Jest/Supertest (planned)
- **Manual Testing:** Swagger UI and Postman collections available

### Test Data
- Use `npm run db:seed:test-users` to create test accounts
- Test user credentials available in `docs/TEST_USERS_GUIDE.md`
- Reset database with `npm run db:reset` when needed

---

## 🔒 Security Features

- **JWT Token Security** with short-lived access tokens
- **Refresh Token Rotation** for enhanced security
- **Password Hashing** with bcryptjs
- **Input Validation** and sanitization
- **CORS Protection** with configurable origins
- **Rate Limiting** (planned)
- **SQL Injection Protection** via Prisma ORM
- **XSS Protection** through input validation

---

## 🌐 Deployment

### Environment Support
- **Development:** Local development with hot reloading
- **Staging:** Testing environment (planned)
- **Production:** Scalable deployment ready

### Database Migrations
The project uses Prisma migrations for database schema management:
```bash
# Create new migration
npx prisma migrate dev --name your_migration_name

# Deploy migrations to production
npx prisma migrate deploy

# Check migration status
npx prisma migrate status
```

---

## 🤝 Contributing

This project is currently in active development. While public contributions are not yet open, the following guidelines will apply:

### Development Workflow
1. Follow existing code structure and naming conventions
2. Write comprehensive API documentation for new endpoints
3. Include proper error handling and validation
4. Test new features thoroughly before submission
5. Update this README when adding new features

### Code Standards
- **ES6+ JavaScript** with modern syntax
- **Async/await** for asynchronous operations
- **Consistent naming:** camelCase for variables, PascalCase for models
- **Error handling:** Use custom ApiError class for consistent responses
- **Documentation:** Comment complex business logic

---

## 📈 Roadmap

### Phase 1: Core Platform (Current)
- ✅ User authentication and management
- ✅ Basic matching system
- ✅ Real-time chat system with Socket.IO
- ✅ Admin dashboard functionality
- 🔄 Community posts and interactions

### Phase 2: Enhanced Communication (Q2 2025)
- 📅 File upload in chat (images, documents)
- 📅 Voice messages and audio calls
- 📅 Group discussions and communities
- 📅 Content moderation tools
- 📅 Push notification system

### Phase 3: Healthcare Integration (Q3 2025)
- 📅 Doctor verification and profiles
- 📅 Appointment booking system
- 📅 Payment processing
- 📅 Medical document handling

### Phase 4: AI & Analytics (Q4 2025)
- 📅 AI-powered matching improvements
- 📅 Health insights and recommendations
- 📅 Advanced analytics dashboard
- 📅 Predictive health features

---

## ⚠️ Known Issues & Limitations

### Current Limitations
- File upload in chat not yet implemented (images/documents)
- Payment processing integration pending
- Mobile app API optimization needed
- Comprehensive test suite in development
- Voice messages and video calls pending

### Performance Considerations
- Database queries optimized with Prisma
- Image uploads limited to 5MB via Cloudinary
- API response times monitored
- Pagination implemented for large datasets

---

## � Support & Contact

### Development Team
**Kanishk Chandna** - Full Stack Developer  
📧 Email: [kanishkchandna29@gmail.com](mailto:kanishkchandna29@gmail.com)  
🔗 GitHub: [@Kanishk2004](https://github.com/Kanishk2004)  
💼 LinkedIn: [Kanishk Chandna](https://www.linkedin.com/in/kanishk-chandna/)

### Project Resources
- **Project Repository:** [thryve-backend-api](https://github.com/Kanishk2004/thryve-backend-api)
- **Project Management:** [Notion Dashboard](https://www.notion.so/Thryve-HQ-2300ce91177880fdb8dceae0a63437af)
- **API Documentation:** Available at `/api-docs` when running locally
- **Issue Tracking:** GitHub Issues (for development team)

---

## 📄 License

This project is currently under private development. License terms will be determined upon public release.

---

## 🌟 Acknowledgments

- **PostgreSQL & Neon** for robust database infrastructure
- **Prisma** for excellent ORM and developer experience
- **Cloudinary** for seamless media management
- **JWT.io** for authentication standards
- **Swagger/OpenAPI** for comprehensive API documentation

---

> **💡 Note:** This project is part of a larger ecosystem aimed at creating meaningful connections within chronic illness communities. The backend API serves as the foundation for web and mobile applications that will help users find support, share experiences, and access healthcare resources.

> *If you find this project interesting or want to follow its development, feel free to star the repository!* ⭐

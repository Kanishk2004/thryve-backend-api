# 👥 User Management & Profile System Documentation

## ✅ **Complete User Management Implementation**

Thryve's user management system provides comprehensive profile management, privacy controls, and user discovery features with health-focused customization.

### **🏗️ User Profile Infrastructure**

#### **1. Complete User Profile Model**
- ✅ **Basic Information**: Full name, username, email, gender, date of birth
- ✅ **Health Context**: Bio, illness associations, support preferences
- ✅ **Privacy Controls**: Anonymous mode, age sharing, illness visibility
- ✅ **Media Management**: Avatar uploads with Cloudinary integration
- ✅ **Account Status**: Active/inactive, email verification, role management
- ✅ **System Fields**: Created/updated timestamps, refresh tokens

#### **2. Profile Customization Features**
- ✅ **Avatar Management** - Upload, update, and delete profile pictures
- ✅ **Bio/About Section** - Personal story and health journey
- ✅ **Username System** - Unique identifiers with availability checking
- ✅ **Privacy Modes** - Control information visibility
- ✅ **Gender Options** - Inclusive gender selection (Male, Female, Non-binary, Prefer not to say)
- ✅ **Age Display** - Optional age sharing with preference controls

#### **3. Account Management**
- ✅ **Profile Updates** - Comprehensive profile editing
- ✅ **Account Deletion** - GDPR-compliant anonymization system
- ✅ **Privacy Toggles** - Real-time privacy setting changes
- ✅ **Username Changes** - Secure username updating with validation
- ✅ **Status Management** - Active/inactive account states

### **📡 User Management API Endpoints**

```bash
# Profile Management
GET    /api/v1/user/profile              # Get current user's full profile
PUT    /api/v1/user/profile              # Update profile information
DELETE /api/v1/user/profile              # Delete account (anonymization)

# Avatar Management  
POST   /api/v1/user/profile/avatar       # Upload new avatar image
DELETE /api/v1/user/profile/avatar       # Remove current avatar

# Account Settings
PUT    /api/v1/user/profile/username     # Change username
PUT    /api/v1/user/profile/privacy      # Toggle privacy mode

# User Discovery
GET    /api/v1/user/profile/:id          # Get public profile by ID
GET    /api/v1/user/search               # Search users by username/name

# Preferences (Related)
GET    /api/v1/user/preferences          # Get user preferences
PUT    /api/v1/user/preferences          # Update user preferences
GET    /api/v1/user/preferences/illnesses # Get illness preferences
PUT    /api/v1/user/preferences/illnesses # Update illness preferences
```

### **🔐 Profile Privacy & Security**

#### **1. Privacy Control System**
```javascript
// Privacy settings in UserPreferences
{
  shareAge: true,           // Show age to other users
  shareIllness: true,       // Show health conditions
  shareLocation: false,     // Show geographic location (future)
  isPrivateProfile: false,  // Private vs public profile
  allowDirectMessages: true, // Accept direct chats
  showOnlineStatus: true    // Display online presence
}
```

#### **2. Anonymous User Support**
- ✅ **Anonymous Accounts** - Users can interact without revealing identity
- ✅ **Anonymous Posting** - Future community posts without name/avatar
- ✅ **Privacy-First Design** - All features work with minimal information
- ✅ **Gradual Information Sharing** - Users can reveal more over time

#### **3. Data Protection Features**
- ✅ **GDPR Compliance** - Right to be forgotten with data anonymization
- ✅ **Data Minimization** - Only collect necessary information
- ✅ **Consent Management** - Clear opt-in for data sharing
- ✅ **Audit Trail** - Track profile changes and access

### **🖼️ Avatar & Media Management**

#### **1. Cloudinary Integration**
```javascript
// Avatar upload configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files allowed'), false);
    }
  }
});
```

#### **2. Image Processing**
- ✅ **Automatic Resizing** - Optimize images for web and mobile
- ✅ **Format Conversion** - Convert to efficient formats (WebP)
- ✅ **Quality Compression** - Reduce file sizes while maintaining quality
- ✅ **CDN Delivery** - Fast global image delivery via Cloudinary
- ✅ **Secure URLs** - Time-limited access URLs for sensitive images

#### **3. Default Avatar System**
- ✅ **Default Profile Image** - Professional placeholder for new users
- ✅ **Avatar Fallbacks** - Graceful handling of failed image loads
- ✅ **Public ID Management** - Track Cloudinary assets for cleanup
- ✅ **Automatic Cleanup** - Remove old avatars when new ones uploaded

### **🔍 User Discovery & Search**

#### **1. Search Functionality**
```javascript
// Search users by username or full name
GET /api/v1/user/search?q=john&page=1&limit=10

// Response with privacy-filtered results
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user-id",
        "username": "johnsmith",
        "fullName": "John Smith",
        "avatarURL": "https://cloudinary.../avatar.jpg",
        "bio": "Living with Type 1 diabetes...",
        "isEmailVerified": true,
        // Only public information shown
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalUsers": 25
    }
  }
}
```

#### **2. Public Profile Views**
- ✅ **Privacy-Filtered Profiles** - Only show information user allows
- ✅ **Verification Badges** - Show email verification status
- ✅ **Health Context** - Display shared illness information (if allowed)
- ✅ **Contact Options** - Enable/disable direct messaging
- ✅ **Activity Indicators** - Show online status (if allowed)

#### **3. User Recommendation Integration**
- ✅ **Search Integration** with matching system
- ✅ **Privacy Compliance** in search results
- ✅ **Performance Optimization** with database indexing
- ✅ **Spam Prevention** - Rate limiting on search requests

### **⚙️ User Preferences System**

#### **1. Complete Preference Model**
```javascript
// UserPreferences schema
{
  // Matching preferences
  ageRangeMin: 18,
  ageRangeMax: 65,
  preferredGender: "ANY", // MALE, FEMALE, NON_BINARY, ANY
  
  // Communication preferences  
  isOpenToGroupChats: true,
  isOpenToMentoring: false,
  isSeekingMentor: false,
  preferredChatStyle: ["supportive", "practical"],
  availabilityHours: ["evening", "night"],
  
  // Privacy settings
  shareAge: true,
  shareIllness: true,
  shareLocation: false,
  
  // Notification preferences
  emailNotifications: true,
  pushNotifications: true,
  mentionNotifications: true
}
```

#### **2. Illness Preference Management**
- ✅ **Multiple Illness Support** - Users can have multiple conditions
- ✅ **Diagnosis Year Tracking** - When condition was diagnosed
- ✅ **Severity Levels** - Mild, moderate, severe classification
- ✅ **Support Type** - Seeking help, offering help, both
- ✅ **Privacy Controls** - Control visibility of each condition

#### **3. Dynamic Preference Updates**
- ✅ **Partial Updates** - Update only changed fields
- ✅ **Validation** - Ensure data consistency and ranges
- ✅ **Real-time Effect** - Changes affect matching immediately
- ✅ **History Tracking** - Log preference changes for analysis

### **🧪 Profile Testing Examples**

#### **1. Profile Creation & Update**
```bash
# Get current profile
curl -X GET http://localhost:51214/api/v1/user/profile \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Update profile information
curl -X PUT http://localhost:51214/api/v1/user/profile \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "fullName": "John Smith Updated",
    "bio": "Living with Type 1 diabetes for 5 years. Happy to help others!",
    "gender": "MALE",
    "dateOfBirth": "1995-03-15"
  }'
```

#### **2. Avatar Upload**
```bash
# Upload new avatar
curl -X POST http://localhost:51214/api/v1/user/profile/avatar \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -F "avatar=@/path/to/image.jpg"

# Response includes new avatar URL
{
  "success": true,
  "data": {
    "avatarURL": "https://res.cloudinary.com/.../new-avatar.jpg",
    "avatarPublicId": "thryve/avatars/user-id-timestamp"
  },
  "message": "Avatar updated successfully"
}
```

#### **3. Privacy Controls**
```bash
# Toggle privacy mode
curl -X PUT http://localhost:51214/api/v1/user/profile/privacy \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"isPrivateProfile": true}'

# Update specific privacy preferences
curl -X PUT http://localhost:51214/api/v1/user/preferences \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "shareAge": false,
    "shareIllness": true,
    "allowDirectMessages": true
  }'
```

### **🗑️ Account Deletion & Data Anonymization**

#### **1. GDPR-Compliant Deletion Process**
```javascript
// When user deletes account:
// 1. Personal data is anonymized
// 2. Messages/posts transferred to "deleted_user" 
// 3. Relationships preserved for community integrity
// 4. No actual data deletion - anonymization instead

const deleteAccount = async (userId) => {
  // Transfer data to system deleted_user account
  await transferUserData(userId, DELETED_USER_ID);
  
  // Anonymize remaining personal information
  await anonymizeUserData(userId);
  
  // Maintain referential integrity
  // Chat messages, posts remain but show as "Deleted User"
};
```

#### **2. Data Retention Policy**
- ✅ **Personal Information** - Anonymized immediately
- ✅ **Chat Messages** - Preserved for other users, attributed to "Deleted User"
- ✅ **Community Posts** - Preserved for community value, anonymized
- ✅ **Health Data** - Completely removed or anonymized
- ✅ **Admin Logs** - Retained for security/audit purposes only

### **📊 User Analytics & Insights**

#### **1. Profile Completion Tracking**
```javascript
// Calculate profile completion percentage
const calculateProfileCompletion = (user) => {
  const fields = [
    'fullName', 'bio', 'avatarURL', 'gender', 
    'dateOfBirth', 'isEmailVerified'
  ];
  
  const completed = fields.filter(field => 
    user[field] && user[field] !== ''
  ).length;
  
  return (completed / fields.length) * 100;
};
```

#### **2. User Engagement Metrics**
- ✅ **Profile Views** - Track how often profile is viewed
- ✅ **Search Appearances** - How often user appears in searches
- ✅ **Interaction Rates** - Response rates to messages/matches
- ✅ **Feature Usage** - Which profile features are most used
- ✅ **Privacy Trends** - How users configure privacy settings

### **🔧 Admin User Management**

#### **1. Admin Dashboard Features**
```bash
# Admin-only endpoints
GET    /api/v1/admin/users              # List all users with filters
PUT    /api/v1/admin/users/:id          # Update user details
POST   /api/v1/admin/users/:id/verify   # Manually verify user
DELETE /api/v1/admin/users/:id          # Admin delete user
PUT    /api/v1/admin/users/:id/status   # Change user status
```

#### **2. User Moderation Tools**
- ✅ **Account Status Management** - Activate/deactivate users
- ✅ **Email Verification Override** - Manual verification for edge cases
- ✅ **Profile Content Review** - Moderate inappropriate content
- ✅ **Privacy Setting Enforcement** - Ensure compliance with policies
- ✅ **Bulk Operations** - Mass user management for maintenance

### **🎯 User Management Best Practices**

#### **1. Performance Optimization**
- ✅ **Database Indexing** on email, username, and search fields
- ✅ **Image Optimization** with Cloudinary transformations
- ✅ **Caching Strategy** for frequently accessed profiles
- ✅ **Pagination** for large user lists and search results
- ✅ **Lazy Loading** for profile images and non-critical data

#### **2. Security Considerations**
- ✅ **Input Validation** on all profile fields
- ✅ **File Upload Security** with type and size restrictions
- ✅ **SQL Injection Prevention** via Prisma ORM
- ✅ **XSS Protection** through output encoding
- ✅ **Rate Limiting** on profile updates and searches

#### **3. User Experience Features**
- ✅ **Real-time Validation** for username availability
- ✅ **Progressive Profile Setup** - optional fields can be added later
- ✅ **Mobile-Optimized** avatar upload and profile editing
- ✅ **Accessibility** features for screen readers
- ✅ **Graceful Degradation** when features are unavailable

### **🚀 Production Readiness Checklist**

✅ **Complete profile management** with all CRUD operations  
✅ **Secure file uploads** with Cloudinary integration  
✅ **Privacy controls** with granular settings  
✅ **User search** with performance optimization  
✅ **Account deletion** with GDPR compliance  
✅ **Admin management tools** for user moderation  
✅ **Data validation** and security measures  
✅ **Mobile-friendly** responsive design ready  
✅ **Performance optimization** with caching and indexing  
✅ **Error handling** and logging throughout  

### **📈 Future Enhancements**

#### **Phase 2: Advanced Features**
1. **Profile Verification System** - Blue checkmarks for verified users
2. **Advanced Privacy Controls** - Granular permission system
3. **Profile Templates** - Quick setup for different user types
4. **Social Connections** - Friend/follow system
5. **Profile Analytics** - Detailed insights for users

#### **Phase 3: Enterprise Features**
1. **Multi-language Profiles** - Internationalization support
2. **Advanced Moderation** - AI-powered content filtering
3. **Profile Import/Export** - Data portability features
4. **Custom Fields** - Admin-configurable profile fields
5. **Integration APIs** - Third-party profile sync

Your user management system provides a **comprehensive foundation** for all user interactions in Thryve and scales effectively with privacy and security as core principles! 👥

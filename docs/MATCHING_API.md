# User Matching System API Documentation

## Overview
The matching system helps users find compatible people based on shared health conditions, preferences, and compatibility factors.

## Endpoints

### 1. Find Matches
**GET** `/api/v1/users/matches`

Find compatible users based on current user's preferences.

#### Query Parameters:
- `page` (number, default: 1) - Page number for pagination
- `limit` (number, default: 10) - Number of results per page
- `minAge` (number, optional) - Minimum age filter
- `maxAge` (number, optional) - Maximum age filter  
- `gender` (string, optional) - Gender preference ('MALE', 'FEMALE', 'OTHER')
- `illnessCategories` (string, optional) - Comma-separated illness categories
- `maxDistance` (number, optional) - Maximum distance (when location is implemented)
- `isOnline` (boolean, optional) - Filter only online users
- `sortBy` (string, default: 'compatibility') - Sort order ('compatibility', 'recent', 'distance')

#### Response:
```json
{
  "success": true,
  "data": {
    "matches": [
      {
        "id": "user-id",
        "username": "john_doe",
        "fullName": "John Doe",
        "bio": "Living with diabetes...",
        "avatarURL": "https://cloudinary.../avatar.jpg",
        "gender": "MALE",
        "isEmailVerified": true,
        "compatibilityScore": 85,
        "matchReasons": [
          "2 shared health conditions",
          "Age compatible",
          "Verified account"
        ],
        "sharedInterests": ["Diabetes", "Anxiety"]
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalMatches": 47,
      "hasNext": true,
      "hasPrev": false
    },
    "matchingCriteria": {
      "hasAgeFilter": true,
      "hasGenderFilter": false,
      "hasIllnessFilter": true,
      "excludesSelf": true,
      "onlyActiveUsers": true
    }
  },
  "message": "Found 10 potential matches"
}
```

### 2. Get Compatibility Score
**GET** `/api/v1/users/matches/compatibility/:targetUserId`

Get detailed compatibility analysis between current user and specific user.

#### Response:
```json
{
  "success": true,
  "data": {
    "compatibilityScore": 85,
    "matchReasons": [
      "2 shared health conditions",
      "Age compatible",
      "Verified account"
    ],
    "sharedInterests": ["Diabetes", "Anxiety"],
    "targetUser": {
      "id": "target-user-id",
      "username": "jane_smith",
      "fullName": "Jane Smith",
      "avatarURL": "https://cloudinary.../avatar.jpg",
      "isEmailVerified": true
    }
  },
  "message": "Compatibility analysis retrieved successfully"
}
```

### 3. Get Recommendations
**GET** `/api/v1/users/recommendations`

Get personalized recommendations based on user activity and preferences.

#### Query Parameters:
- `type` (string, default: 'general') - Recommendation type ('general', 'similar_illness', 'mentor', 'mentee')
- `limit` (number, default: 5) - Number of recommendations

#### Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "user-id",
      "username": "recommended_user",
      "fullName": "Recommended User",
      "compatibilityScore": 92,
      "matchReasons": ["3 shared health conditions", "Potential mentor match"]
    }
  ],
  "message": "Recommendations retrieved successfully"
}
```

### 4. Record Interaction
**POST** `/api/v1/users/interactions`

Record user interaction for improving matching algorithm.

#### Request Body:
```json
{
  "targetUserId": "user-id",
  "interactionType": "like", // 'view', 'like', 'pass', 'message', 'block'
  "metadata": {
    "source": "match_list",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

#### Response:
```json
{
  "success": true,
  "data": null,
  "message": "Interaction recorded successfully"
}
```

## Matching Algorithm

### Compatibility Scoring (0-100 points)

1. **Illness Compatibility (40 points max)**
   - +20 points per shared chronic illness
   - Weighted by illness category overlap

2. **Age Compatibility (20 points max)**
   - Full points for exact age range match
   - Partial points for close age ranges (±5 years)

3. **Communication Style (20 points max)**
   - Group chat preferences alignment
   - Preferred chat style overlap

4. **Verification & Activity Bonuses (20 points max)**
   - +10 points for verified email
   - +15 points for mentor/mentee compatibility
   - Additional factors for engagement

### Prerequisites

Before using the matching system, users must:
1. ✅ Complete user preferences (`/api/v1/users/preferences`)
2. ✅ Set illness preferences (`/api/v1/users/preferences/illnesses`)
3. ✅ Have verified email address (recommended)

### Error Responses

- **400 Bad Request**: "Please set your preferences first to find matches"
- **404 Not Found**: "User not found"
- **401 Unauthorized**: Invalid or missing authentication token

## Usage Examples

### Find High Compatibility Matches
```javascript
// Find highly compatible users with diabetes
GET /api/v1/users/matches?illnessCategories=Endocrine&sortBy=compatibility&limit=5
```

### Get Mentor Recommendations
```javascript
// Find potential mentors
GET /api/v1/users/recommendations?type=mentor&limit=3
```

### Record Match Interaction
```javascript
// User liked someone
POST /api/v1/users/interactions
{
  "targetUserId": "user-123",
  "interactionType": "like",
  "metadata": { "source": "match_list" }
}
```

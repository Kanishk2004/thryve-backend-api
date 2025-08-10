# Test Users Generation Guide

This guide explains how to generate test users with random illness preferences for testing your matching algorithms.

## Overview

You now have multiple ways to generate test users:

1. **Seed Script** (Recommended for initial setup)
2. **CLI Tool** (For ongoing testing)
3. **API Endpoints** (For programmatic access)

## Method 1: Seed Script

### Quick Start
```bash
npm run db:seed:test-users
```

This generates 12 predefined test users with realistic data and random illness preferences.

### Features
- **Realistic Data**: Names, emails, bios, demographics
- **Random Illness Preferences**: 1-4 illnesses per user
- **Varied Preferences**: Different age ranges, genders, chat styles
- **Main vs Secondary Illnesses**: Each user has one primary condition
- **Severity Levels**: Random severity (1-5 scale)
- **Support Preferences**: Random seeking/offering support flags

## Method 2: CLI Tool

### Generate Random Users
```bash
npm run test-users generate 10    # Generate 10 random users
npm run test-users generate       # Generate 5 users (default)
```

### View Statistics
```bash
npm run test-users stats
```

### Clear Test Users
```bash
npm run test-users clear
```

## Method 3: API Endpoints (Admin Only)

### Generate Test Users
```http
POST /api/admin/test-users/generate
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "count": 10
}
```

### Get Statistics
```http
GET /api/admin/test-users/stats
Authorization: Bearer <admin_token>
```

### Clear Test Users
```http
DELETE /api/admin/test-users/clear
Authorization: Bearer <admin_token>
```

## Generated Data Structure

### User Data
- **Email**: `firstname.lastname###@testuser.com` or `@test.com`
- **Username**: `firstname_lastname_###`
- **Password**: `testpassword123` (for all test users)
- **Full Name**: Realistic first and last names
- **Gender**: MALE, FEMALE (for preferences: MALE, FEMALE, ANY)
- **Date of Birth**: Random dates between 1970-2005
- **Bio**: Realistic health-related bios
- **Email Verified**: `true` (for testing convenience)

### User Preferences
- **Age Range**: Random min (18-25) to max (50-70)
- **Preferred Gender**: MALE, FEMALE, or ANY
- **Group Chats**: 80% open to group chats
- **Mentoring**: 30% open to mentoring, 40% seeking mentors
- **Chat Style**: Random combination of: supportive, practical, casual, deep
- **Availability**: Random combination of: morning, afternoon, evening, night
- **Privacy**: 70% share age, 90% share illnesses

### Illness Preferences
- **Count**: 1-4 illnesses per user
- **Main Illness**: First illness is marked as primary
- **Diagnosed Year**: Random between 2015-2024
- **Severity Level**: Random 1-5 scale
- **Seeking Support**: 80% probability
- **Offering Support**: 40% probability

## Available Illnesses

The system includes 35+ illnesses across categories:
- **Autoimmune**: Rheumatoid Arthritis, Type 1 Diabetes, MS, Lupus, Celiac
- **Mental Health**: Depression, Anxiety, Bipolar, PTSD, OCD
- **Chronic Pain**: Fibromyalgia, CFS, Endometriosis, Migraine
- **Cardiovascular**: Heart Disease, Hypertension, Arrhythmia
- **Respiratory**: Asthma, COPD, Cystic Fibrosis
- **Neurological**: Epilepsy, Parkinson's, Alzheimer's
- **Digestive**: Crohn's, Ulcerative Colitis, IBS
- **Endocrine**: Type 2 Diabetes, Hypothyroidism, Hyperthyroidism
- **And more...**

## Testing Your Matching Algorithms

With the generated test users, you can test:

1. **Age-based Matching**: Users have varied age ranges
2. **Gender Preferences**: Mix of MALE, FEMALE, ANY preferences
3. **Illness Matching**: Common conditions across users
4. **Severity Matching**: Different severity levels
5. **Support Type Matching**: Seekers vs Providers
6. **Communication Style Matching**: Different chat preferences
7. **Availability Matching**: Various time preferences

## Sample Test Scenarios

### Find Users with Same Main Illness
```sql
SELECT u1.fullName, u2.fullName, i.name as illness
FROM User u1
JOIN UserPreferences up1 ON u1.id = up1.user_id
JOIN UserIllnessPreference uip1 ON up1.id = uip1.userPreferenceId
JOIN User u2 ON u2.id != u1.id
JOIN UserPreferences up2 ON u2.id = up2.user_id
JOIN UserIllnessPreference uip2 ON up2.id = uip2.userPreferenceId
JOIN Illness i ON uip1.illnessId = i.id AND uip2.illnessId = i.id
WHERE uip1.isMainIllness = true AND uip2.isMainIllness = true;
```

### Find Support Seekers and Providers
```sql
SELECT 
  seeker.fullName as seeker,
  provider.fullName as provider,
  i.name as illness
FROM User seeker
JOIN UserPreferences up_seeker ON seeker.id = up_seeker.user_id
JOIN UserIllnessPreference uip_seeker ON up_seeker.id = uip_seeker.userPreferenceId
JOIN User provider ON provider.id != seeker.id
JOIN UserPreferences up_provider ON provider.id = up_provider.user_id
JOIN UserIllnessPreference uip_provider ON up_provider.id = uip_provider.userPreferenceId
JOIN Illness i ON uip_seeker.illnessId = i.id AND uip_provider.illnessId = i.id
WHERE uip_seeker.isSeekingSupport = true 
  AND uip_provider.isOfferingSupport = true;
```

## Login Credentials

All test users use the same password for convenience:
- **Password**: `testpassword123`
- **Email**: Check generated emails (end with `@test.com` or `@testuser.com`)

## Development vs Production

- Test user generation is **disabled in production**
- API endpoints check `NODE_ENV` before allowing operations
- Test users are easily identifiable by email domains
- Safe to clear test users without affecting real users

## Cleanup

To remove all test users:
```bash
npm run test-users clear
```

This removes:
- Test user accounts
- Their preferences
- Their illness preferences
- All related data

## Next Steps

1. **Generate test users** using one of the methods above
2. **Test your matching algorithms** with the diverse user base
3. **Analyze results** using the statistics endpoint
4. **Iterate** by clearing and regenerating users as needed
5. **Scale up** by generating more users for stress testing

The test users provide a realistic dataset for developing and testing sophisticated matching algorithms based on multiple criteria including illnesses, preferences, demographics, and support needs.

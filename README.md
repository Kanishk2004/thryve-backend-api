# Thryve - Backend API

Thryve is a real-time, community-driven support platform designed to empower individuals navigating chronic illnesses like Type 1 Diabetes, Thalassemia, and more.

This backend API powers all core functionalities of the Thryve platform — from user authentication and role-based access to post sharing, encrypted chats, anonymous identity handling, and doctor consultations.

---

## 🚀 Tech Stack

- **Node.js**
- **Express.js**
- **PostgreSQL** (via [Neon](https://neon.tech/))
- **Prisma ORM**
- **JWT** for Authentication
- **WebSockets** *(planned for real-time chat)*
- **Stripe** (for mentor/doctor consultations)
- **Cloudinary** (for media uploads)
- **Nodemailer** (for email notifications)
- **Zod** (for validation)

---

## 📁 Project Structure

```
thryve-backend/
├── src/
│   ├── controllers/
│   ├── routes/
│   ├── middlewares/
│   ├── services/
│   ├── utils/
│   └── config/
├── prisma/
│   └── schema.prisma
├── .env
├── index.js
└── README.md
```
*This structure may evolve as more modules and features are added.*

---

## 🏁 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/Kanishk2004/thryve-backend.git
cd thryve-backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root and add the following variables:
```ini
DATABASE_URL=your_postgresql_database_url  
JWT_SECRET=your_jwt_secret  
CLOUDINARY_CLOUD_NAME=your_cloud_name  
CLOUDINARY_API_KEY=your_api_key  
CLOUDINARY_API_SECRET=your_api_secret  
EMAIL_USER=your_email  
EMAIL_PASS=your_email_password  
STRIPE_SECRET_KEY=your_stripe_key  
```

### 4. Migrate Database
```bash
npx prisma migrate dev --name init
```

### 5. Start the Server
```bash
npm run dev
```

---

## ✨ Key Features (Planned & Ongoing)

- **User Authentication** (Anonymous / Email-Based)
- **Verified Doctor & Mentor Roles**
- **Email Verification & Password Resets**
- **Community Posts** (Anonymous & Public)
- **Real-Time Peer Chats** (with WebSocket support)
- **Doctor Slot Booking with Stripe Payments**
- **AI-Generated Summaries** (via uploaded medical docs)
- **In-App & Email Notifications**
- **Private Mood Journals**
- **Admin Dashboard** (limited access)

---

## 🧪 Testing

Unit and integration testing to be implemented using **Jest** or **Supertest**.

---

## 📄 Documentation

- **API Documentation:** Coming soon via Swagger / Postman collection
- **Project Management:** [Notion Dashboard](https://www.notion.so/Thryve-HQ-2300ce91177880fdb8dceae0a63437af)

---

## 👤 Developer

**Kanishk Chandna**  
Full Stack Developer | Builder of Thryve  
[GitHub](https://github.com/Kanishk2004) · [LinkedIn](https://www.linkedin.com/in/kanishk-chandna/)

---

> *If you like this project or find it helpful, feel free to give it a star!*

# MailFlow — Bulk Email Sender

<div align="center">
  <img src="screenshots/s1.png" alt="MailFlow Dashboard" width="800" />
  <p><em>Professional bulk email sending platform with campaign management and analytics</em></p>
</div>

---

## 📋 Overview

MailFlow is a full-stack bulk email sending platform that allows users to manage contacts, create and send email campaigns, configure SMTP settings, and monitor campaign performance.

Built with **Next.js 14** for the frontend and **Hono** for the backend, MailFlow provides a modern and responsive email marketing experience.

---

## ✨ Features

* 🔐 **Authentication** — Secure login and registration with session management
* 📇 **Contact Management** — CRUD operations, contact groups, CSV import/export
* 📧 **Campaign Management** — Create, edit, schedule, and send campaigns
* ✨ **Rich Text Editor** — WYSIWYG email editor powered by Tiptap
* ⚙️ **SMTP Configuration** — Configure and test any SMTP provider
* 📊 **Dashboard Analytics** — Real-time campaign and contact statistics
* 🎨 **Modern UI** — Responsive interface built with Tailwind CSS

---

## 📸 Screenshots

| Dashboard                        | Campaigns                        | Contacts                        |
| -------------------------------- | -------------------------------- | ------------------------------- |
| ![Dashboard](screenshots/s1.png) | ![Campaigns](screenshots/s2.png) | ![Contacts](screenshots/s3.png) |

| SMTP Settings                        | Email Editor             |
| ------------------------------------ | ------------------------ |
| ![SMTP Settings](screenshots/s4.png) | Rich text email composer |

---

## 📁 Project Structure

```bash
MailFlow/
├── frontend/                         # Next.js 14 frontend
│   ├── app/
│   │   ├── layout.tsx               # Root layout with providers
│   │   ├── page.tsx                 # Landing page
│   │   ├── login/page.tsx           # Login page
│   │   ├── register/page.tsx        # Registration page
│   │   └── dashboard/               # Protected dashboard routes
│   │       ├── layout.tsx           # Dashboard layout
│   │       ├── page.tsx             # Dashboard home
│   │       ├── contacts/            # Contact management
│   │       ├── campaigns/           # Campaign management
│   │       └── settings/            # SMTP settings
│   │
│   ├── components/
│   │   ├── layout/                  # Sidebar, Navbar
│   │   └── email/                   # Rich text editor
│   │
│   ├── lib/
│   │   ├── api.ts                   # API client
│   │   ├── auth-context.tsx         # Auth provider
│   │   ├── validations.ts           # Zod schemas
│   │   └── utils.ts                 # Utility functions
│   │
│   ├── types/                       # TypeScript types
│   ├── public/                      # Static assets
│   └── package.json
│
├── backend/                         # Hono backend API
│   ├── src/
│   │   ├── app.ts                   # Main application entry
│   │   ├── middleware/              # Authentication middleware
│   │   ├── routes/
│   │   │   ├── auth.ts              # Authentication routes
│   │   │   ├── contacts.ts          # Contact routes
│   │   │   ├── campaigns.ts         # Campaign routes
│   │   │   ├── config.ts            # SMTP configuration
│   │   │   └── dashboard.ts         # Dashboard statistics
│   │   │
│   │   ├── services/
│   │   │   ├── userDatabase.ts
│   │   │   ├── emailService.ts
│   │   │   └── notificationService.ts
│   │   │
│   │   └── types.ts
│   │
│   ├── data/                        # SQLite database
│   ├── .env
│   └── package.json
│
├── screenshots/
│   ├── s1.png                       # Dashboard
│   ├── s2.png                       # Campaigns
│   ├── s3.png                       # Contacts
│   └── s4.png                       # SMTP Settings
│
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

Ensure you have the following installed:

* Node.js 18+
* npm, yarn, or bun
* SMTP provider credentials (Gmail or any SMTP service)

---

## ⚙️ Installation

### 1️⃣ Clone Repository

```bash
git clone <your-repository-url>
cd MailFlow
```

---

### 2️⃣ Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
```

### Backend `.env`

```env
PORT=8080
CORS_ORIGIN=http://localhost:3000
SESSION_SECRET=your-super-secret-key-min-32-chars
NODE_ENV=development

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=MailFlow
```

---

### 3️⃣ Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
```

### Frontend `.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

---

## ▶️ Running the Application

### Start Backend

```bash
cd backend
npm run dev
```

Backend runs on:

```bash
http://localhost:8080
```

---

### Start Frontend

```bash
cd frontend
npm run dev
```

Frontend runs on:

```bash
http://localhost:3000
```

---

## 🔗 Application URLs

| Service      | URL                                                          |
| ------------ | ------------------------------------------------------------ |
| Frontend     | [http://localhost:3000](http://localhost:3000)               |
| Backend API  | [http://localhost:8080](http://localhost:8080)               |
| Health Check | [http://localhost:8080/health](http://localhost:8080/health) |

---

## 🔧 SMTP Configuration

### Gmail SMTP Setup

1. Enable **2-Step Verification** on your Google account.
2. Generate an **App Password**:

```text
Google Account → Security → App Passwords
```

3. Choose:

* App: Mail
* Device: Windows Computer

4. Copy the generated 16-character password.
5. Enable IMAP in Gmail Settings:

```text
Settings → Forwarding and POP/IMAP → Enable IMAP
```

---

## 📨 SMTP Settings in Application

Navigate to:

```text
Dashboard → Settings → SMTP Settings
```

| Field      | Value              |
| ---------- | ------------------ |
| SMTP Host  | smtp.gmail.com     |
| Port       | 587                |
| SSL/TLS    | Disabled           |
| Username   | Your Gmail Address |
| Password   | Gmail App Password |
| From Name  | Your Name          |
| From Email | Your Gmail Address |

---

## 🛠 Tech Stack

### Frontend

| Technology      | Purpose                         |
| --------------- | ------------------------------- |
| Next.js 14      | React framework with App Router |
| TypeScript      | Type safety                     |
| Tailwind CSS    | Styling                         |
| TanStack Query  | Server state management         |
| React Hook Form | Form handling                   |
| Zod             | Validation                      |
| Tiptap          | Rich text editor                |
| Lucide React    | Icons                           |

### Backend

| Technology     | Purpose                    |
| -------------- | -------------------------- |
| Hono           | Lightweight HTTP framework |
| better-sqlite3 | SQLite database            |
| Argon2         | Password hashing           |
| Nodemailer     | Email sending              |
| Zod            | Request validation         |

---

## 📡 API Endpoints

All API routes are prefixed with:

```text
/api
```

### Authentication

| Method | Endpoint       | Description      |
| ------ | -------------- | ---------------- |
| POST   | /auth/register | Create account   |
| POST   | /auth/login    | Login user       |
| POST   | /auth/logout   | Logout user      |
| GET    | /user/info     | Get current user |

### Contacts

| Method | Endpoint         | Description        |
| ------ | ---------------- | ------------------ |
| GET    | /contacts        | Get contacts       |
| GET    | /contacts/groups | Get contact groups |
| POST   | /contacts        | Create contact     |
| PUT    | /contacts/:id    | Update contact     |
| DELETE | /contacts/:id    | Delete contact     |

### Campaigns

| Method | Endpoint            | Description      |
| ------ | ------------------- | ---------------- |
| GET    | /campaigns          | Get campaigns    |
| GET    | /campaigns/:id      | Campaign details |
| POST   | /campaigns          | Create campaign  |
| PUT    | /campaigns/:id      | Update campaign  |
| DELETE | /campaigns/:id      | Delete campaign  |
| POST   | /campaigns/:id/send | Send campaign    |
| POST   | /campaigns/:id/test | Send test email  |

### SMTP Configuration

| Method | Endpoint          | Description          |
| ------ | ----------------- | -------------------- |
| GET    | /config/smtp      | Get SMTP config      |
| POST   | /config/smtp      | Save SMTP config     |
| POST   | /config/smtp/test | Test SMTP connection |

### Dashboard

| Method | Endpoint         | Description              |
| ------ | ---------------- | ------------------------ |
| GET    | /dashboard/stats | Get dashboard statistics |

---

## 🎯 Usage Guide

### 1️⃣ Create an Account

* Navigate to `/register`
* Fill in your details
* Create your account

### 2️⃣ Configure SMTP

* Go to `Settings → SMTP Settings`
* Add your SMTP credentials
* Save settings
* Send a test email

### 3️⃣ Add Contacts

* Navigate to `Contacts`
* Add contacts manually or import CSV files
* Create groups for better organization

### 4️⃣ Create Campaign

* Go to `Campaigns → New Campaign`
* Write email content using the editor
* Select recipient group
* Save or schedule the campaign

### 5️⃣ Send Campaign

* Open campaign list
* Click `Send`
* Confirm recipients
* Launch your campaign

---

## 🔒 Security Features

* Argon2 password hashing
* Secure session management
* Zod validation on all endpoints
* CORS protection
* Parameterized SQL queries
* Protected dashboard routes

---

## 📦 Production Build

### Backend

```bash
cd backend
npm run build
npm start
```

### Frontend

```bash
cd frontend
npm run build
npm start
```

---

## 🐛 Troubleshooting

| Issue                      | Solution                             |
| -------------------------- | ------------------------------------ |
| Backend won't start        | Ensure port 8080 is available        |
| Frontend cannot connect    | Verify backend is running            |
| SMTP authentication failed | Use Gmail App Password               |
| Unauthorized requests      | Clear cookies and login again        |
| Database errors            | Delete `data/` directory and restart |

---

## 📧 Gmail SMTP Troubleshooting

* Enable IMAP in Gmail settings
* Use App Password instead of regular password
* Visit:

```text
https://accounts.google.com/DisplayUnlockCaptcha
```

* Try SSL with port 465 if 587 fails

---

## 📄 License

This project was built as a Full Stack Developer Assignment.

---

## 👨‍💻 Author

Built with ❤️ using Next.js and Hono.

---

## ⚡ Quick Commands Reference

### Backend

```bash
cd backend
npm install
npm run dev
npm run build
npm start
```

### Frontend

```bash
cd frontend
npm install
npm run dev
npm run build
npm start
npm run type-check
npm run lint
```

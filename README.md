# House Rent Webapp

A user-based web application for searching and publishing house rental ads. Currently in MVP phase with user authentication.

## 🚀 What's Built So Far

### ✅ Completed Features (v1 MVP)

1. **User Authentication**
   - User signup with email/password
   - User login
   - Password hashing with bcryptjs (passwords are never stored in plain text)
   - Basic user profile page

2. **Database**
   - SQLite database (local development)
   - Prisma ORM for database management
   - User model with email, password, name, and timestamps

3. **Tech Stack**
   - **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS
   - **Backend**: Next.js API Routes
   - **Database**: SQLite (via Prisma)
   - **Password Hashing**: bcryptjs

## 📁 Project Structure

```
webapp/
├── app/
│   ├── api/
│   │   └── auth/
│   │       ├── signup/route.ts    # Signup API endpoint
│   │       └── login/route.ts      # Login API endpoint
│   ├── login/
│   │   └── page.tsx                # Login page
│   ├── signup/
│   │   └── page.tsx                # Signup page
│   ├── profile/
│   │   └── page.tsx                # User profile page
│   ├── page.tsx                    # Home page
│   └── layout.tsx                  # Root layout
├── lib/
│   └── prisma.ts                   # Prisma client instance
├── prisma/
│   ├── schema.prisma               # Database schema
│   └── migrations/                 # Database migrations
└── .env                            # Environment variables (not in git)
```

## 🛠️ Setup Instructions

### Prerequisites

- Node.js 18+ installed
- npm or yarn
- Git

### Installation

1. **Navigate to the project directory:**
   ```bash
   cd webapp
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   The `.env` file should already exist with:
   ```
   DATABASE_URL="file:./dev.db"
   ```

4. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

5. **Run database migrations:**
   ```bash
   npx prisma migrate dev
   ```
   This creates the SQLite database file (`dev.db`) and applies the schema.

6. **Start the development server:**
   ```bash
   npm run dev
   ```

7. **Open your browser:**
   Visit [http://localhost:3000](http://localhost:3000)

## 🧪 Testing the App

1. **Sign Up:**
   - Go to `/signup`
   - Enter email, password, and optional name
   - Click "Sign up"
   - You'll be redirected to login

2. **Login:**
   - Go to `/login`
   - Enter your email and password
   - Click "Sign in"
   - You'll be redirected to your profile page

3. **View Profile:**
   - After logging in, you'll see your profile at `/profile`
   - Shows your email, name, and account creation date

## 🔐 Security Notes

- **Passwords**: All passwords are hashed using bcryptjs before storing in the database
- **Authentication**: Currently using localStorage (temporary). For production, we'll implement proper session management with cookies/HTTP-only cookies
- **Validation**: Basic email/password validation is in place

## 📊 Database Schema

### User Model

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String   // Hashed password
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## 🔄 Git Workflow

- **Main branch**: Stable, production-ready code
- **Dev branch**: Active development branch (where you should work)

### Common Git Commands

```bash
# Switch to dev branch
git checkout dev

# Create a new feature branch
git checkout -b feature/your-feature-name

# After making changes
git add .
git commit -m "Description of changes"
git push origin dev
```

## 🚧 Next Steps (Future Features)

1. **Session Management**
   - Replace localStorage with proper server-side sessions
   - Use HTTP-only cookies for security

2. **Home Listings**
   - Create `Home` model in database
   - Add "Create Listing" page
   - Add "Search Listings" page

3. **Ratings System**
   - Create `Rating` model
   - Allow users to rate homeowners and renters

4. **AI Matching**
   - Integrate AI service for home matching based on user preferences

5. **Production Deployment**
   - Set up Azure hosting
   - Migrate from SQLite to Azure SQL Database or PostgreSQL
   - Set up CI/CD pipeline

## 📝 Database Management

### View Database in Prisma Studio

```bash
npx prisma studio
```

This opens a visual database browser at `http://localhost:5555` where you can view and edit data.

### Create a New Migration

After changing `prisma/schema.prisma`:

```bash
npx prisma migrate dev --name your_migration_name
```

### Reset Database (⚠️ Deletes all data)

```bash
npx prisma migrate reset
```

## 🐛 Troubleshooting

### Database Issues

If you get database errors:
1. Make sure `dev.db` exists in the `prisma/` directory
2. Run `npx prisma generate` to regenerate the client
3. Run `npx prisma migrate dev` to apply migrations

### Port Already in Use

If port 3000 is busy:
```bash
# Kill the process using port 3000 (macOS/Linux)
lsof -ti:3000 | xargs kill -9
```

Or change the port in `package.json`:
```json
"dev": "next dev -p 3001"
```

## 📚 Learning Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

## 🤝 Contributing

This is a step-by-step learning project. Each feature is built incrementally with explanations.

---

**Current Status**: ✅ MVP Complete - User signup/login working locally

**Next Milestone**: Add session management and home listings feature

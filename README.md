# TaskFlow — Team Task Manager

A full-stack team task management application with role-based access control, real-time task tracking, and project collaboration features.

## 🚀 Live Demo

> **Live URL:** `https://your-app.up.railway.app` *(replace after deploying)*

## ✨ Features

- **Authentication** — Signup/Login with JWT tokens, persistent sessions
- **Role-Based Access Control** — Global roles (Admin/Member) + per-project roles
- **Project Management** — Create projects, invite members, set colors
- **Task Tracking** — Create, assign, filter, and update tasks with priorities and due dates
- **Board View** — Kanban-style board grouped by status
- **Dashboard** — Overview of your tasks, overdue items, and project progress
- **Comments** — Thread discussions on individual tasks
- **Overdue Detection** — Visual warnings for past-due tasks

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, Axios |
| Backend | Node.js, Express.js |
| Database | SQLite (via better-sqlite3) |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Validation | express-validator |
| Deployment | Railway |

## 📁 Project Structure

```
taskflow/
├── backend/
│   ├── models/db.js          # SQLite schema & connection
│   ├── middleware/auth.js     # JWT + role guards
│   ├── routes/
│   │   ├── auth.js           # Signup, login, /me
│   │   ├── projects.js       # Project CRUD + member management
│   │   ├── tasks.js          # Task CRUD + comments + filters
│   │   └── dashboard.js      # Aggregated stats
│   └── server.js             # Express entry point
├── frontend/
│   └── src/
│       ├── context/AuthContext.jsx
│       ├── pages/
│       │   ├── AuthPage.jsx
│       │   ├── Dashboard.jsx
│       │   ├── Projects.jsx
│       │   ├── ProjectDetail.jsx
│       │   └── TaskDetail.jsx
│       └── components/Sidebar.jsx
├── railway.json
├── nixpacks.toml
└── package.json
```

## 🗄 Database Schema

```sql
users         — id, name, email, password, role (admin|member)
projects      — id, name, description, color, owner_id
project_members — project_id, user_id, role (admin|member)
tasks         — id, title, description, status, priority, project_id,
                assignee_id, created_by, due_date
comments      — id, task_id, user_id, content
```

## 🔐 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/auth/users` | List all users |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | My projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Project + members |
| PUT | `/api/projects/:id` | Update (admin) |
| DELETE | `/api/projects/:id` | Delete (owner/admin) |
| POST | `/api/projects/:id/members` | Add member (admin) |
| DELETE | `/api/projects/:id/members/:uid` | Remove member |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/:pid/tasks` | List tasks (filterable) |
| POST | `/api/projects/:pid/tasks` | Create task |
| GET | `/api/projects/:pid/tasks/:id` | Task + comments |
| PUT | `/api/projects/:pid/tasks/:id` | Update task |
| DELETE | `/api/projects/:pid/tasks/:id` | Delete task |
| POST | `/api/projects/:pid/tasks/:id/comments` | Add comment |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Stats + recent + overdue |

## 🚢 Deploying to Railway

### Step 1: Push to GitHub
```bash
cd taskflow
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/taskflow.git
git push -u origin main
```

### Step 2: Create Railway Project
1. Go to [railway.app](https://railway.app) and sign in
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your `taskflow` repository
4. Railway auto-detects `nixpacks.toml` and builds

### Step 3: Set Environment Variables
In Railway dashboard → your service → **Variables**:

```
JWT_SECRET=your-very-long-random-secret-here
NODE_ENV=production
DB_PATH=/data/taskflow.db
PORT=5000
```

> **Tip:** For `JWT_SECRET`, generate one: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

### Step 4: (Optional) Add Persistent Volume
For persistent SQLite storage across deploys:
1. Railway Dashboard → your service → **Volumes**
2. Add volume, mount path: `/data`
3. Set `DB_PATH=/data/taskflow.db` in env vars

### Step 5: Get Your URL
Railway provides a URL like `https://taskflow-production-xxxx.up.railway.app`

## 💻 Local Development

```bash
# Install all deps
cd backend && npm install
cd ../frontend && npm install

# Run backend (port 5000)
cd backend && npm run dev

# Run frontend (port 5173, proxies /api to 5000)
cd frontend && npm run dev
```

Open http://localhost:5173

## 👥 Role Permissions

| Action | Member | Project Admin | Global Admin |
|--------|--------|---------------|--------------|
| View projects they belong to | ✅ | ✅ | ✅ |
| Create projects | ✅ | ✅ | ✅ |
| Invite members | ❌ | ✅ | ✅ |
| Create tasks | ✅ | ✅ | ✅ |
| Edit own tasks | ✅ | ✅ | ✅ |
| Edit any task | ❌ | ✅ | ✅ |
| Delete any task | ❌ | ✅ | ✅ |
| Delete project | ❌ | Owner only | ✅ |

## 📝 License

MIT

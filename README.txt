TaskFlow — Simple Team Task Manager
Live Link
https://taskflow-production-7765.up.railway.app
________________


About the Project
I built this project to understand how task management systems work in real-world scenarios, especially things like user authentication, assigning tasks, and managing roles inside a project.
The main focus was on backend logic like:
* handling users and login
* managing projects and team members
* assigning and tracking tasks
* implementing role-based access (Admin/Member)
The UI is kept simple and functional.
________________


Features
* User signup and login (JWT-based authentication)
* Create and manage projects
* Add/remove members in a project
* Role-based access (Admin / Member)
* Create and assign tasks
* Update task status (todo, in-progress, done)
* Basic dashboard (my tasks, overdue tasks)
________________


Tech Stack
* Frontend: React
* Backend: Node.js, Express
* Database: SQLite
* Authentication: JWT + bcrypt
* Deployment: Railway
________________


Folder Structure (simplified)
backend/
  models/
  routes/
  middleware/
  server.js


frontend/
  src/


________________


API Overview
Auth
* POST /api/auth/signup
* POST /api/auth/login
Projects
* GET /api/projects
* POST /api/projects
* GET /api/projects/:id
* POST /api/projects/:id/members
Tasks
* GET /api/projects/:id/tasks
* POST /api/projects/:id/tasks
* PUT /api/projects/:id/tasks/:taskId
Dashboard
* GET /api/dashboard
________________


Role Logic (important part)
Each project has a membership system where:
* A user can be part of multiple projects
* Each user has a role inside a project (Admin or Member)
Admin can:
* add/remove members
* manage tasks
Member can:
* view project
* work on assigned tasks
________________


How to Run Locally
git clone <repo-link>
cd taskflow


cd backend
npm install
npm run dev


cd frontend
npm install
npm run dev


________________


Limitations / Improvements
* No real-time updates (requires refresh)
* UI is basic (focus was backend)
* Role system can be expanded further
* No notifications system yet
________________


What I Learned
* How JWT authentication works
* How to design relationships between users, projects, and tasks
* Structuring REST APIs properly
* Implementing role-based access control
________________


Demo
In the demo, I show:
* Login
* Creating a project
* Adding members
* Creating and assigning tasks
* Updating task status
* Viewing dashboard
________________


Notes
This project was built mainly to understand backend system design and API structuring, so the emphasis is more on functionality than UI polish.

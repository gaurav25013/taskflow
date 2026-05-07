const express = require('express');
const db = require('../models/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard - overall stats for current user
router.get('/', authenticate, (req, res) => {
  const userId = req.user.id;
  const today = new Date().toISOString().split('T')[0];

  const myProjects = db.prepare(`
    SELECT COUNT(DISTINCT pm.project_id) as count
    FROM project_members pm WHERE pm.user_id = ?
  `).get(userId);

  const myTasks = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN t.status = 'todo' THEN 1 ELSE 0 END) as todo,
      SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN t.status = 'review' THEN 1 ELSE 0 END) as review,
      SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as done,
      SUM(CASE WHEN t.due_date < ? AND t.status != 'done' THEN 1 ELSE 0 END) as overdue
    FROM tasks t
    JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = ?
    WHERE t.assignee_id = ? OR t.created_by = ?
  `).get(today, userId, userId, userId);

  const recentTasks = db.prepare(`
    SELECT t.*, p.name as project_name, p.color as project_color,
      u.name as assignee_name
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = ?
    LEFT JOIN users u ON u.id = t.assignee_id
    WHERE t.assignee_id = ? OR t.created_by = ?
    ORDER BY t.updated_at DESC LIMIT 10
  `).all(userId, userId, userId);

  const overdueTasks = db.prepare(`
    SELECT t.*, p.name as project_name, p.color as project_color,
      u.name as assignee_name
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = ?
    LEFT JOIN users u ON u.id = t.assignee_id
    WHERE t.due_date < ? AND t.status != 'done'
      AND (t.assignee_id = ? OR t.created_by = ?)
    ORDER BY t.due_date ASC LIMIT 5
  `).all(userId, today, userId, userId);

  const projectStats = db.prepare(`
    SELECT p.id, p.name, p.color,
      COUNT(t.id) as total_tasks,
      SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as done_tasks
    FROM projects p
    JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
    LEFT JOIN tasks t ON t.project_id = p.id
    GROUP BY p.id ORDER BY p.created_at DESC LIMIT 6
  `).all(userId);

  res.json({
    stats: {
      projects: myProjects.count,
      tasks: myTasks
    },
    recentTasks,
    overdueTasks,
    projectStats
  });
});

module.exports = router;

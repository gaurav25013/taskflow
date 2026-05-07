const express = require('express');
const { body, query, validationResult } = require('express-validator');
const db = require('../models/db');
const { authenticate, requireProjectAccess, requireProjectAdmin } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

// GET /api/projects/:projectId/tasks
router.get('/', authenticate, requireProjectAccess, (req, res) => {
  const { status, priority, assignee, search } = req.query;
  let sql = `
    SELECT t.*,
      u1.name as assignee_name, u1.email as assignee_email,
      u2.name as created_by_name
    FROM tasks t
    LEFT JOIN users u1 ON u1.id = t.assignee_id
    LEFT JOIN users u2 ON u2.id = t.created_by
    WHERE t.project_id = ?
  `;
  const params = [req.params.projectId];

  if (status) { sql += ' AND t.status = ?'; params.push(status); }
  if (priority) { sql += ' AND t.priority = ?'; params.push(priority); }
  if (assignee) { sql += ' AND t.assignee_id = ?'; params.push(assignee); }
  if (search) { sql += ' AND (t.title LIKE ? OR t.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  sql += ' ORDER BY t.created_at DESC';

  res.json(db.prepare(sql).all(...params));
});

// POST /api/projects/:projectId/tasks
router.post('/', authenticate, requireProjectAccess, [
  body('title').trim().notEmpty().withMessage('Title required'),
  body('description').optional().trim(),
  body('status').optional().isIn(['todo', 'in_progress', 'review', 'done']),
  body('priority').optional(),
  body('assignee_id').optional().isInt(),
  body('due_date').optional().isDate()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, description, status = 'todo', priority = 'medium', assignee_id, due_date } = req.body;

  // Validate assignee is a project member
  if (assignee_id) {
    const isMember = db.prepare(
      'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?'
    ).get(req.params.projectId, assignee_id);
    if (!isMember) return res.status(400).json({ error: 'Assignee must be a project member' });
  }

  const result = db.prepare(`
    INSERT INTO tasks (title, description, status, priority, project_id, assignee_id, created_by, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, description, status, priority, req.params.projectId, assignee_id || null, req.user.id, due_date || null);

  const task = db.prepare(`
    SELECT t.*, u1.name as assignee_name, u2.name as created_by_name
    FROM tasks t
    LEFT JOIN users u1 ON u1.id = t.assignee_id
    LEFT JOIN users u2 ON u2.id = t.created_by
    WHERE t.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(task);
});

// GET /api/projects/:projectId/tasks/:id
router.get('/:id', authenticate, requireProjectAccess, (req, res) => {
  const task = db.prepare(`
    SELECT t.*, u1.name as assignee_name, u1.email as assignee_email, u2.name as created_by_name
    FROM tasks t
    LEFT JOIN users u1 ON u1.id = t.assignee_id
    LEFT JOIN users u2 ON u2.id = t.created_by
    WHERE t.id = ? AND t.project_id = ?
  `).get(req.params.id, req.params.projectId);

  if (!task) return res.status(404).json({ error: 'Task not found' });

  const comments = db.prepare(`
    SELECT c.*, u.name as user_name FROM comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.task_id = ? ORDER BY c.created_at ASC
  `).all(req.params.id);

  res.json({ ...task, comments });
});

// PUT /api/projects/:projectId/tasks/:id
router.put('/:id', authenticate, requireProjectAccess, [
  body('title').optional().trim().notEmpty(),
  body('status').optional().isIn(['todo', 'in_progress', 'review', 'done']),
  body('priority').optional(),
  body('assignee_id').optional({ nullable: true }),
  body('due_date').optional({ nullable: true })
], (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND project_id = ?')
    .get(req.params.id, req.params.projectId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  // Members can only update status/their own tasks; admins can update everything
  const isAdmin = req.projectRole === 'admin' || req.user.role === 'admin';
  const isCreator = task.created_by === req.user.id;
  const isAssignee = task.assignee_id === req.user.id;

  if (!isAdmin && !isCreator && !isAssignee) {
    return res.status(403).json({ error: 'Not authorized to edit this task' });
  }

  const { title, description, status, priority, assignee_id, due_date } = req.body;

  db.prepare(`
    UPDATE tasks SET
      title = ?, description = ?, status = ?, priority = ?,
      assignee_id = ?, due_date = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    title ?? task.title,
    description ?? task.description,
    status ?? task.status,
    priority ?? task.priority,
    assignee_id !== undefined ? assignee_id : task.assignee_id,
    due_date !== undefined ? due_date : task.due_date,
    req.params.id
  );

  const updated = db.prepare(`
    SELECT t.*, u1.name as assignee_name, u2.name as created_by_name
    FROM tasks t
    LEFT JOIN users u1 ON u1.id = t.assignee_id
    LEFT JOIN users u2 ON u2.id = t.created_by
    WHERE t.id = ?
  `).get(req.params.id);

  res.json(updated);
});

// DELETE /api/projects/:projectId/tasks/:id
router.delete('/:id', authenticate, requireProjectAccess, (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND project_id = ?')
    .get(req.params.id, req.params.projectId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const isAdmin = req.projectRole === 'admin' || req.user.role === 'admin';
  const isCreator = task.created_by === req.user.id;
  if (!isAdmin && !isCreator) {
    return res.status(403).json({ error: 'Not authorized to delete this task' });
  }

  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ message: 'Task deleted' });
});

// POST /api/projects/:projectId/tasks/:id/comments
router.post('/:id/comments', authenticate, requireProjectAccess, [
  body('content').trim().notEmpty().withMessage('Comment cannot be empty')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const result = db.prepare(
    'INSERT INTO comments (task_id, user_id, content) VALUES (?, ?, ?)'
  ).run(req.params.id, req.user.id, req.body.content);

  const comment = db.prepare(`
    SELECT c.*, u.name as user_name FROM comments c
    JOIN users u ON u.id = c.user_id WHERE c.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(comment);
});

module.exports = router;

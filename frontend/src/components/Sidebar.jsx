import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LayoutDashboard, FolderKanban, LogOut, Plus } from 'lucide-react'
import { useState, useEffect } from 'react'
import axios from 'axios'

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])

  useEffect(() => {
    axios.get('/api/projects').then(r => setProjects(r.data.slice(0, 6))).catch(() => {})
  }, [])

  const handleLogout = () => { logout(); navigate('/auth') }
  const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U'

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-text">Task<span>Flow</span></div>
      </div>

      <nav className="sidebar-nav">
        <span className="nav-section-label">Overview</span>
        <NavLink to="/dashboard" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <LayoutDashboard size={16} />
          Dashboard
        </NavLink>
        <NavLink to="/projects" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <FolderKanban size={16} />
          All Projects
        </NavLink>

        {projects.length > 0 && (
          <>
            <span className="nav-section-label" style={{ marginTop: 8 }}>Recent Projects</span>
            {projects.map(p => (
              <NavLink
                key={p.id}
                to={`/projects/${p.id}`}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <span className="project-dot" style={{ background: p.color }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{user?.role}</div>
          </div>
          <button className="btn btn-icon btn-ghost" onClick={handleLogout} title="Logout" style={{ width: 30, height: 30, padding: 4 }}>
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}

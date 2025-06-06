import React from 'react'
import "../Styles/sidebar.css";
import { NavLink } from 'react-router-dom';
const Sidebar = () => {
  return (
    <div className='sidebar'>
         <nav className='links'>
         <img src="/assets/téléchargement.png" alt="Logo" />
                        <NavLink to="/dashboard" className="sidebar-link" activeClassName="active">
                            Calendar
                        </NavLink>
                        <NavLink to="/notifs" className="sidebar-link" activeClassName="active">
                            Alerts
                        </NavLink>
                        <NavLink to="/profile" className="sidebar-link" activeClassName="active">
                            My profile
                        </NavLink>
                    
                        <NavLink to="/" className="sidebar-link logout-link" activeClassName="active">
                            Logout
                        </NavLink>
                    
            </nav>
    </div>
  )
}

export default Sidebar
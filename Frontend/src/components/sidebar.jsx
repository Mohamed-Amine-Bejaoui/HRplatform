import React from 'react'
import "../Styles/sidebar.css";
import { NavLink } from 'react-router-dom';
const Sidebar = () => {
  return (
    <div className='sidebar'>
         <nav className='links'>
         <img src="/assets/téléchargement.png" alt="Logo" />
         <NavLink to="/dashboard" className="sidebar-link" activeClassName="active">
                            Ma Préscence
                        </NavLink>
                        <NavLink to="/profile" className="sidebar-link" activeClassName="active">
                            Mon profil
                        </NavLink>
                        <NavLink to="/notifs" className="sidebar-link" activeClassName="active">
                            Notifications
                        </NavLink>
                        <NavLink to="/salaire" className="sidebar-link" activeClassName="active">
                            Salaire
                        </NavLink>
                    
                    
                    
                        <NavLink to="/" className="sidebar-link logout-link" activeClassName="active">
                            Logout
                        </NavLink>
                    
                
            </nav>
    </div>
  )
}

export default Sidebar
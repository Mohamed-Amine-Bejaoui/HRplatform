import React from 'react'
import "../../Styles/admin/sidebar.css";
import { NavLink } from 'react-router-dom';
const SideAd = () => {
  return (
    <div className='sidebar'>
         <nav className='links'>
         <img src="/assets/téléchargement.png" alt="Logo" />
                        <NavLink to="/admin-dashboard" className="sidebar-link" activeClassName="active">
                            Dashboard
                        </NavLink>
                        <NavLink to="/employeesAd" className="sidebar-link" activeClassName="active">
                            Employés
                        </NavLink>

                        <NavLink to="/profileAd" className="sidebar-link" activeClassName="active">
                            Mon profil
                        </NavLink>
                        <NavLink to="/notifsAd" className="sidebar-link" activeClassName="active">
                            Notifications
                        </NavLink>
                        <NavLink to="/salaireAd" className="sidebar-link" activeClassName="active">
                            Salaire
                        </NavLink>
                        <NavLink to="/inputsAd" className="sidebar-link" activeClassName="active">
                        entrées

                        </NavLink>
                    
                    
                        <NavLink to="/" className="sidebar-link logout-link" activeClassName="active">
                            Logout
                        </NavLink>
                    
                
            </nav>
    </div>
  )
}

export default SideAd
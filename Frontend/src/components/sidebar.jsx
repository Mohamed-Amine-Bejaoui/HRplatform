import React from 'react'
import "../Styles/sidebar.css";
import { NavLink } from 'react-router-dom';
const Sidebar = () => {
  return (
    <div className='sidebar'>
         <nav className='links'>
         <img src="/assets/téléchargement.png" alt="Logo" />
         <NavLink to="/home" className="sidebar-link" activeClassName="active">
                            Articles
                        </NavLink>
                
                        <NavLink to="/Categorie" className="sidebar-link" activeClassName="active">
                            Categorie
                        </NavLink>
                
                        <NavLink to="/commandes" className="sidebar-link" activeClassName="active">
                            Commandes
                        </NavLink>
                    
                    
                        <NavLink to="/fournisseurs" className="sidebar-link" activeClassName="active">
                            Fournisseur
                        </NavLink>
                    
                    

                        <NavLink to="/inventory" className="sidebar-link" activeClassName="active">
                            Rapports
                        </NavLink>
                    
                    
                    
                        <NavLink to="/" className="sidebar-link logout-link" activeClassName="active">
                            Logout
                        </NavLink>
                    
                
            </nav>
    </div>
  )
}

export default Sidebar
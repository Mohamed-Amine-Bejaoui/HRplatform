import React from 'react'
import Sidebar from './sidebar'
import "../Styles/profile.css";

const Profile = () => {
  return (
    <div className='prf'>
    <Sidebar />
    <div className="prcontainer">
      <h1>Profile</h1>
    </div>
  </div>
  )
}

export default Profile
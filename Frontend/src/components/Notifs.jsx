import React from 'react'
import Sidebar from './sidebar'
import "../Styles/notifs.css";

const Notifs = () => {
  return (
    <div className='ntf'>
    <Sidebar />
    <div className="nfcontainer">
      <h1>Notifs</h1>
    </div>
  </div>
  )
}

export default Notifs
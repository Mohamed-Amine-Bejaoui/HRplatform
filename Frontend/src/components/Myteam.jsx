import React from 'react'
import Sidebar from './sidebar'
import "../Styles/myteeam.css";

const Myteam = () => {
  return (
    <div className='tem'>
    <Sidebar />
    <div className="tmcontainer">
      <h1>Mon équipe</h1>
      <ul class="modern-list">
        <li>Mohaamed Aminee Bejoaui</li>
        <li>Mohaamed Aminee Bejoaui</li>
        <li>Mohaamed Aminee Bejoaui</li>
        <li>Mohaamed Aminee Bejoaui</li>
    </ul>
    </div>
  </div>
  )
}

export default Myteam
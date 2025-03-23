import React from 'react'
import Sidebar from './sidebar'
import "../Styles/demandees.css";

const Demandes = () => {
  return (
    <div className='dem'>
    <Sidebar />
    <div className="dmcontainer">
      <h1>Demandes</h1>
      <div className='buttons'>
        <div className='btn'>
            congés
        </div>
        <div className='btn'>
                télétravail
        </div>
      </div>
    </div>
  </div>
  )
}

export default Demandes
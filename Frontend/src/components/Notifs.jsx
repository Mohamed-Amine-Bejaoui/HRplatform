import React, { useState, useEffect } from 'react';
import Sidebar from './sidebar'
import "../Styles/notifs.css";
import { jwtDecode } from "jwt-decode";

const Notifs = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const storedUser = localStorage.getItem("authToken");
  const decodedToken = jwtDecode(storedUser);
  const empNumAux = decodedToken.emp_num_aux;
  console.log(empNumAux);
  
  const [filters, setFilters] = useState({
    anomaly: 'all', 
    resolved: 'all',
    month: 'all',
    year:'all',
    employee: empNumAux 
  });

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (filters.anomaly !== 'all') {
        params.append('anomaly', filters.anomaly);
      }
      if (filters.resolved !== 'all') {
        params.append('resolved', filters.resolved === 'resolved');
      }
      if (filters.month !== 'all') {
        params.append('month', filters.month);
      }
      if (filters.year !== 'all') {
        params.append('year', filters.year);
      }
      // Always filter by the logged-in employee's ID
      if (empNumAux) {
        params.append('emp_num_aux', empNumAux); // Changed from 'employee' to 'emp_num_aux'
      }
            
      const response = await fetch(`http://localhost:5000/alertplan/alerts?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setAlerts(data);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [filters, empNumAux]); // Added empNumAux to dependency array

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const markAsResolved = async (id) => {
    try {
      const response = await fetch(`http://localhost:5000/alertplan/alerts/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resolved: true }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update alert');
      }
      
      fetchAlerts(); // Refresh the list
    } catch (error) {
      console.error('Error resolving alert:', error);
      setError(error.message);
    }
  };

  return (
    <div className='ntf'>
      <Sidebar />
      <div className="nfcontainer">
        <h1>Alerts</h1>
        
        {error && (
          <div className="error-message">
            Error: {error}
          </div>
        )}

        {/* Show current employee info */}
        <div className="employee-info">
          <p><strong>Employee ID:</strong> {empNumAux}</p>
        </div>

        {/* Filter Controls - Removed employee search since it's auto-filtered */}
        <div className="filter-controls">
          <div className="filter-group">
            <label>Absence Type:</label>
            <select 
              name="anomaly"
              value={filters.anomaly}
              onChange={handleFilterChange}
            >
              <option value="all">All Types</option>
              <option value="Approved absence">Approved Absences</option>
              <option value="Inapproved absence">Inapproved Absences</option>
              <option value="Unexpected presence">Unexpected presence</option>
              <option value="Late arrival">Late arrival</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Status:</label>
            <select 
              name="resolved"
              value={filters.resolved}
              onChange={handleFilterChange}
            >
              <option value="all">All</option>
              <option value="resolved">Resolved</option>
              <option value="unresolved">Unresolved</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Month:</label>
            <select
              name="month"
              value={filters.month || 'all'}
              onChange={handleFilterChange}
            >
              <option value="all">All Months</option>
              <option value="1">January</option>
              <option value="2">February</option>
              <option value="3">March</option>
              <option value="4">April</option>
              <option value="5">May</option>
              <option value="6">June</option>
              <option value="7">July</option>
              <option value="8">August</option>
              <option value="9">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Year:</label>
            <select
              name="year"
              value={filters.year}
              onChange={handleFilterChange}
            >
              <option value="all">All Years</option>
              <option value="2023">2023</option>
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
          </div>
        </div>

        {/* Alerts Table */}
        {loading ? (
          <div className="loading">Loading your alerts...</div>
        ) : (
          <div className="alerts-table-container">
            {alerts.length === 0 ? (
              <div className="no-alerts">
                No alerts found for your account
              </div>
            ) : (
              <table className="alerts-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Expected</th>
                    <th>Actual</th>
                    <th>Type</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((alert) => (
                    <tr key={alert.id} className={alert.resolved ? 'resolved' : 'unresolved'}>
                      <td>{new Date(alert.detected_on).toLocaleDateString()}</td>
                      <td>{alert.expected_status || 'N/A'}</td>
                      <td className={`status-${alert.actual_status}`}>
                        {alert.actual_status}
                      </td>
                      <td>{alert.anomaly}</td>
                      <td>
                        <td>
                        {!alert.resolved && (
                          <button 
                            onClick={() => markAsResolved(alert.id)}
                            className="resolve-btn"
                          >
                            Mark Resolved
                          </button>
                        )}
                      </td>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifs;
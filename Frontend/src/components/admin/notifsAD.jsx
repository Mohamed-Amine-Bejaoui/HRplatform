import React, { useState, useEffect } from 'react';
import SideAd from './sideAd';
import "../../Styles/notifs.css";

const NotifsAD = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rechID, setRechID] = useState("");

  const [filters, setFilters] = useState({
    anomaly: 'all', 
    resolved: 'all',
    month: 'all',
    year:'all',
    employee:'all'
  });

  const handleInputChange2 = (e) => {
    setRechID(e.target.value);
  };

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
      // Add employee filter
      if (filters.employee !== 'all' && filters.employee.trim() !== '') {
        params.append('emp_num_aux', filters.employee);
        console.log(filters.employee)
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

  const handlerecherche = async (e) => {
    e.preventDefault();
    // Set the employee filter to the search input value
    setFilters(prev => ({ ...prev, employee: rechID }));
  };

  const handleReset = () => {
    setRechID("");
    setFilters(prev => ({ ...prev, employee: 'all' }));
  };

  useEffect(() => {
    fetchAlerts();
  }, [filters]);

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
      <SideAd />
      <div className="nfcontainer">
        <h1>Absence Alerts Management</h1>
        
        {error && (
          <div className="error-message">
            Error: {error}
          </div>
        )}

        {/* Filter Controls */}
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

          {/* Employee Search */}
          <div className="filter-group">
            <form onSubmit={handlerecherche} onReset={handleReset} className="searchni">
              <input
                type="text"
                placeholder="Employee ID"
                onChange={handleInputChange2}
                value={rechID}
                className="input"
              />
              <button type="submit" className="rechbut">Search</button>
              <button type="reset" className="resbut">Reset</button>
            </form>
          </div>
        </div>

        {/* Alerts Table */}
        {loading ? (
          <div className="loading">Loading alerts...</div>
        ) : (
          <div className="alerts-table-container">
            {alerts.length === 0 ? (
              <div className="no-alerts">
                {filters.employee !== 'all' 
                  ? `No alerts found for employee ${filters.employee}` 
                  : 'No alerts found matching your criteria'
                }
              </div>
            ) : (
              <table className="alerts-table">
                <thead>
                  <tr>
                    <th>Employee ID</th>
                    <th>Date</th>
                    <th>Expected</th>
                    <th>Actual</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((alert) => (
                    <tr key={alert.id} className={alert.resolved ? 'resolved' : 'unresolved'}>
                      <td>{alert.emp_num_aux || 'N/A'}</td>
                      <td>{new Date(alert.detected_on).toLocaleDateString()}</td>
                      <td>{alert.expected_status || 'N/A'}</td>
                      <td className={`status-${alert.actual_status}`}>
                        {alert.actual_status}
                      </td>
                      <td>{alert.anomaly}</td>
                      <td>
                        <span className={`resolution-badge ${alert.resolved ? 'resolved' : 'unresolved'}`}>
                          {alert.resolved ? 'Resolved' : 'Unresolved'}
                        </span>
                      </td>
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

export default NotifsAD;
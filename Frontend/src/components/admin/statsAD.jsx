import React, { useEffect, useState } from 'react';
import axios from 'axios';
import SideAd from './sideAd';
import '../../Styles/salaire.css';

const StatisticsAd = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get('http://localhost:5000/statplan/statistics');
        setStats(res.data);
      } catch (error) {
        console.error('Error fetching statistics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatPercentage = (value) => {
    return `${parseFloat(value).toFixed(1)}%`;
  };

  const getComplianceColor = (rate) => {
    if (rate >= 90) return '#22c55e'; // Green
    if (rate >= 70) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  const getRiskLevel = (alertCount) => {
    if (alertCount >= 10) return { level: 'critical', color: '#ef4444', icon: '🚨' };
    if (alertCount >= 7) return { level: 'high', color: '#f59e0b', icon: '⚠️' };
    if (alertCount >= 4) return { level: 'medium', color: '#3b82f6', icon: '📊' };
    return { level: 'low', color: '#22c55e', icon: '✅' };
  };

  const CircularProgress = ({ percentage, color, size = 120, strokeWidth = 8 }) => {
    const validPercentage = typeof percentage === 'number' && !isNaN(percentage) ? percentage : 0;
    const clampedPercentage = Math.min(Math.max(validPercentage, 0), 100);
    
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = `${(clampedPercentage / 100) * circumference} ${circumference}`;

    return (
      <div className="circular-progress" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            className="progress-circle"
          />
        </svg>
        <div className="progress-text">
          <span className="progress-value">{clampedPercentage.toFixed(1)}%</span>
        </div>
      </div>
    );
  };

  const BarChart = ({ data, maxValue }) => {
    return (
      <div className="bar-chart">
        {data.map((entry, idx) => {
          const height = maxValue > 0 ? (entry.late_count / maxValue) * 100 : 0;
          const intensity = entry.late_count > 3 ? 'high' : entry.late_count > 1 ? 'medium' : 'low';
          
          return (
            <div key={idx} className="bar-item">
              <div className="bar-container">
                <div 
                  className={`bar-fill ${intensity}`}
                  style={{ height: `${Math.max(height, 5)}%` }}
                  data-tooltip={`${entry.late_count} late arrivals`}
                ></div>
              </div>
              <div className="bar-label">
                {new Date(entry.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                })}
              </div>
              <div className="bar-value">{entry.late_count}</div>
            </div>
          );
        })}
      </div>
    );
  };

  const MetricCard = ({ icon, title, value, subtitle, type }) => {
    return (
      <div className={`metric-card ${type}`}>
        <div className="metric-header">
          <div className="metric-icon">{icon}</div>
          <div className="metric-trend">
            <span className="trend-indicator">↗</span>
          </div>
        </div>
        <div className="metric-body">
          <h3 className="metric-title">{title}</h3>
          <div className="metric-value">{value}</div>
          <p className="metric-subtitle">{subtitle}</p>
        </div>
      </div>
    );
  };

  const EmployeeCard = ({ employee, rank, type = 'general' }) => {
    let alertCount, alertLabel, avatarColor;
    
    switch(type) {
      case 'late':
        alertCount = employee.late_count;
        alertLabel = 'Late Arrivals';
        avatarColor = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
        break;
      case 'short':
        alertCount = employee.short_shift_count;
        alertLabel = 'Short Shifts';
        avatarColor = 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)';
        break;
      case 'absence':
        alertCount = employee.absence_count;
        alertLabel = 'Absences';
        avatarColor = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
        break;
      default:
        alertCount = employee.alert_count;
        alertLabel = 'Total Alerts';
        avatarColor = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }

    const risk = getRiskLevel(alertCount);

    return (
      <div className={`employee-card ${risk.level}`}>
        <div className="employee-header">
          <div className="employee-rank">
            <span className="rank-number">#{rank}</span>
          </div>
          <div className="employee-avatar" style={{ background: avatarColor }}>
            <span className="avatar-text">{employee.emp_num_aux.slice(0, 2)}</span>
          </div>
          <div className="employee-info">
            <h4 className="employee-id">{employee.emp_num_aux}</h4>
            <div className="risk-badge" style={{ backgroundColor: risk.color }}>
              <span className="risk-icon">{risk.icon}</span>
              <span className="risk-text">{risk.level} risk</span>
            </div>
          </div>
        </div>
        
        <div className="employee-stats">
          <div className="alert-count-display">
            <div className="alert-number">{alertCount}</div>
            <div className="alert-label">{alertLabel}</div>
          </div>
        </div>
      </div>
    );
  };

  if (loading || !stats) {
    return (
      <div className="stat">
        <SideAd />
        <div className="statcontainer">
          <div className="loading-screen">
            <div className="loading-animation">
              <div className="loading-circle"></div>
              <div className="loading-circle"></div>
              <div className="loading-circle"></div>
            </div>
            <h3>Loading Analytics...</h3>
            <p>Gathering insights from your data</p>
          </div>
        </div>
      </div>
    );
  }

  const safeStats = {
    complianceRate: parseFloat(stats?.complianceRate) || 0,
    discrepancyRate: parseFloat(stats?.discrepancyRate) || 0,
    resolutionRate: parseFloat(stats?.resolutionRate) || 0,
    unjustifiedPresence: parseInt(stats?.unjustifiedPresence) || 0,
    absenteeLostHours: parseInt(stats?.absenteeLostHours) || 0,
    lateTrend: stats?.lateTrend || [],
    topAlertedEmployees: stats?.topAlertedEmployees || [],
    mostLateEmployees: stats?.mostLateEmployees || [],
    mostShortShiftEmployees: stats?.mostShortShiftEmployees || [],
    mostAbsentEmployees: stats?.mostAbsentEmployees || []
  };

  const maxLateCount = safeStats.lateTrend.length > 0 ? 
    Math.max(...safeStats.lateTrend.map(entry => entry.late_count || 0)) : 0;

  return (
    <div className="stat">
      <SideAd />
      <div className="statcontainer">
        <div className="modern-stats-header">
          <div className="header-content">
            <h1>Analytics Dashboard</h1>
            <p>check insights into employees attendance and performance</p>
          </div>
        </div>

        <div className="modern-stats-dashboard">
          {/* Key Performance Indicators */}
          <div className="kpi-section">
            <div className="metrics-grid">
              <MetricCard
                icon="✅"
                title="Compliance Rate"
                value={formatPercentage(safeStats.complianceRate)}
                subtitle="Overall attendance"
                type="primary"
              />
              <MetricCard
                icon="⚠️"
                title="Discrepancy Rate"
                value={formatPercentage(safeStats.discrepancyRate)}
                subtitle="Unresolved issues"
                type="warning"
              />
              <MetricCard
                icon="🔧"
                title="Resolution Rate"
                value={formatPercentage(safeStats.resolutionRate)}
                subtitle="Issues resolved"
                type="success"
              />
              <MetricCard
                icon="⏰"
                title="Lost Hours"
                value={`${safeStats.absenteeLostHours} hrs`}
                subtitle="Total lost time"
                type="danger"
              />
            </div>
          </div>

          {/* Charts Section */}
          <div className="charts-section">
            <div className="chart-card">
              <div className="chart-header">
                <h3>📈 Performance Overview</h3>
              </div>
              <div className="chart-content">
                <div className="progress-charts">
                  <div className="progress-item">
                    <CircularProgress 
                      percentage={safeStats.complianceRate} 
                      color={getComplianceColor(safeStats.complianceRate)}
                      size={150}
                    />
                    <div className="progress-info">
                      <h4>Attendance Compliance</h4>
                      <p>Overall performance rate</p>
                    </div>
                  </div>
                  
                  <div className="progress-item">
                    <CircularProgress 
                      percentage={safeStats.resolutionRate} 
                      color="#3b82f6"
                      size={120}
                    />
                    <div className="progress-info">
                      <h4>Resolution Rate</h4>
                      <p>Issues being resolved</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-header">
                <h3>📊 Late Arrivals Trend</h3>
                <div className="time-filter">
                  <span className="filter-badge">Last 30 Days</span>
                </div>
              </div>
              <div className="chart-content">
                {safeStats.lateTrend.length === 0 ? (
                  <div className="empty-chart">
                    <div className="empty-icon">🎉</div>
                    <h4>Perfect Attendance!</h4>
                    <p>No late arrivals recorded in the past 30 days</p>
                  </div>
                ) : (
                  <>
                    <div className="chart-stats">
                      <div className="stat-item">
                        <span className="stat-label">Peak Day</span>
                        <span className="stat-value">{maxLateCount}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Total</span>
                        <span className="stat-value">
                          {safeStats.lateTrend.reduce((sum, entry) => sum + (entry.late_count || 0), 0)}
                        </span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Average</span>
                        <span className="stat-value">
                          {(safeStats.lateTrend.reduce((sum, entry) => sum + (entry.late_count || 0), 0) / safeStats.lateTrend.length).toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <BarChart data={safeStats.lateTrend} maxValue={maxLateCount} />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Most Alerted Employees Section */}
          <div className="employees-section">
            <div className="section-header">
              <h2>🎯 Most Alerted Employees </h2>
              <p>Top employees with the highest number of overall alerts</p>
            </div>
            
            {safeStats.topAlertedEmployees.length === 0 ? (
              <div className="empty-employees">
                <div className="empty-icon">🌟</div>
                <h3>Excellent Performance!</h3>
                <p>No significant attendance issues detected</p>
              </div>
            ) : (
              <div className="employees-grid">
                {safeStats.topAlertedEmployees.map((employee, index) => (
                  <EmployeeCard 
                    key={employee.emp_num_aux} 
                    employee={employee} 
                    rank={index + 1}
                    type="general"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Late Arrivals Section */}
          <div className="employees-section">
            <div className="section-header">
              <h2>⏰ Most Late Arrivals</h2>
              <p>Top employees with the highest number of late arrival incidents</p>
            </div>
            
            {safeStats.mostLateEmployees.length === 0 ? (
              <div className="empty-employees">
                <div className="empty-icon">🌟</div>
                <h3>Excellent Punctuality!</h3>
                <p>No late arrival issues detected</p>
              </div>
            ) : (
              <div className="employees-grid">
                {safeStats.mostLateEmployees.map((employee, index) => (
                  <EmployeeCard 
                    key={employee.emp_num_aux} 
                    employee={employee} 
                    rank={index + 1}
                    type="late"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Short Shifts Section */}
          <div className="employees-section">
            <div className="section-header">
              <h2>⏳ Most Short Shifts</h2>
              <p>Top employees with the highest number of short shift incidents</p>
            </div>
            
            {safeStats.mostShortShiftEmployees.length === 0 ? (
              <div className="empty-employees">
                <div className="empty-icon">🌟</div>
                <h3>Full Shift Compliance!</h3>
                <p>No short shift issues detected</p>
              </div>
            ) : (
              <div className="employees-grid">
                {safeStats.mostShortShiftEmployees.map((employee, index) => (
                  <EmployeeCard 
                    key={employee.emp_num_aux} 
                    employee={employee} 
                    rank={index + 1}
                    type="short"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Unapproved Absences Section */}
          <div className="employees-section">
            <div className="section-header">
              <h2>❌ Most Unapproved Absences</h2>
              <p>Top employees with the highest number of unapproved absence incidents</p>
            </div>
            
            {safeStats.mostAbsentEmployees.length === 0 ? (
              <div className="empty-employees">
                <div className="empty-icon">🌟</div>
                <h3>Perfect Attendance!</h3>
                <p>No unapproved absence issues detected</p>
              </div>
            ) : (
              <div className="employees-grid">
                {safeStats.mostAbsentEmployees.map((employee, index) => (
                  <EmployeeCard 
                    key={employee.emp_num_aux} 
                    employee={employee} 
                    rank={index + 1}
                    type="absence"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsAd;

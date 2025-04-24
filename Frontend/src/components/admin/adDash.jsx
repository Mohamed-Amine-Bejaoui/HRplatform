import React, { useEffect, useState } from "react";
import "../../Styles/dashboard.css";
import SideAd from "./sideAd";
import { jwtDecode } from "jwt-decode";

const AdDash = () => {
  const [loaded, setLoaded] = useState(false);
  const [logs, setLogs] = useState([]);
  const storedUser = localStorage.getItem("authToken");
  const decodedToken = jwtDecode(storedUser);

  useEffect(() => {
    setTimeout(() => setLoaded(true), 100);
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await fetch(`http://localhost:5000/logsplan/prescence/${decodedToken.emp_num_aux}`);
      if (!response.ok) {
        throw new Error("Failed to fetch employee presence");
      }
      const data = await response.json();
      setLogs(data);
    } catch (error) {
      console.error("Error fetching presence data:", error);
    }
  };

  const logMap = {};
  logs.forEach(log => {
    const dateStr = new Date(log.date).toISOString().split("T")[0];
    logMap[dateStr] = log;
  });

  const allDates = logs.map(log => new Date(log.date));
  const minDate = allDates.length ? new Date(Math.min(...allDates)) : new Date();
  const maxDate = allDates.length ? new Date(Math.max(...allDates)) : new Date();
  minDate.setHours(0, 0, 0, 0);
  maxDate.setHours(0, 0, 0, 0);

  const generateCalendarDays = () => {
    const days = [];
    const current = new Date(minDate);

    const startDay = (current.getDay() + 6) % 7; 
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-start-${i}`} className="calendar-day empty"></div>);
    }

    while (current <= maxDate) {
      const dateStr = current.toISOString().split("T")[0];
      const log = logMap[dateStr];
      const workedHours = log?.worked_hours ?? 0;

      days.push(
        <div key={dateStr} className={`calendar-day ${workedHours > 0 ? "present" : "absent"}`}>
          <div className="date">{current.getDate()} / {current.getMonth() + 1}</div>
          {log ? (
            <div className="details">
              <p>In: {log.check_in_actual || "-"}</p>
              <p>Out: {log.check_out_actual || "-"}</p>
              <p>{log.anomaly ? `⚠️ ${log.anomaly}` : `✔ ${workedHours} h`}</p>
            </div>
          ) : (
            <div className="details empty">No data</div>
          )}
        </div>
      );

      current.setDate(current.getDate() + 1);
    }

    const endDay = (current.getDay() + 6) % 7;
    if (endDay !== 0) {
      for (let i = endDay; i < 7; i++) {
        days.push(<div key={`empty-end-${i}`} className="calendar-day empty"></div>);
      }
    }

    return days;
  };

  return (
    <div className={`dash ${loaded ? "active" : ""}`}>
      <SideAd />
      <div className="dcontainer">
        <h1 style={{textAlign:"left"}}>Presence Calendar</h1>
        <div className="calendar-header">
          <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
        </div>
        <div className="calendar-grid">{generateCalendarDays()}</div>
      </div>
    </div>
  );
};

export default AdDash;

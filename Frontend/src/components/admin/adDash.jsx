import React, { useEffect, useState } from "react";
import "../../Styles/dashboard.css";
import SideAd from "./sideAd";
import { jwtDecode } from "jwt-decode";

const AdDash = () => {
  const [loaded, setLoaded] = useState(false);
  const [logs, setLogs] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [rechID,setRechID]=useState("")
  const [logID,setLogID]=useState("")

  const storedUser = localStorage.getItem("authToken");
  const decodedToken = jwtDecode(storedUser);

  useEffect(() => {
    setTimeout(() => setLoaded(true), 100);
    fetchLogs(decodedToken.emp_num_aux);
  }, [currentMonth]);

  const fetchLogs = async (aux) => {
    try {
      const month = (currentMonth.getMonth() + 1).toString().padStart(2, '0');
      const year = currentMonth.getFullYear();

      const response = await fetch(`http://localhost:5000/logsplan/presence/${aux}?month=${month}&year=${year}`);
      if (!response.ok) throw new Error("Failed to fetch employee presence");

      const data = await response.json();
      setLogs(data);
      setLogID(aux)
    } catch (error) {
      console.error("Error fetching presence data:", error);
    }
  };

  const logMap = {};
  logs.forEach(log => {
    const dateStr = new Date(log.date).toISOString().split("T")[0];
    logMap[dateStr] = log;
  });

  const getPeriodLabel = () => {
    return currentMonth.toLocaleString("default", { month: "long", year: "numeric" });
  };

  const changeMonth = (offset) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + offset);
    setCurrentMonth(newMonth);
  };

  const generateCalendarDays = () => {
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const days = [];
    const current = new Date(startOfMonth);
    const startDay = (current.getDay() + 6) % 7;
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-start-${i}`} className="calendar-day empty"></div>);
    }

    while (current <= endOfMonth) {
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
  }
  const handleInputChange2=(e)=>{
    setRechID(e.target.value)
  }
  const handlerecherche=async (e)=>{
    e.preventDefault();
    fetchLogs(rechID);}

  return (
    <div className={`dash ${loaded ? "active" : ""}`}>
      <SideAd />
      <div className="dcontainer">
        <div className="header-controls">
        <h1 className="title-left">ID : {logID}</h1>
        <form onSubmit={handlerecherche} onReset={fetchLogs}className="searchn">
            <input
              type="text"
              placeholder="Id employé"
              onChange={handleInputChange2}
              value={rechID}
              className="input"
            />
            <button type="submit" className="rechbut">Rechercher</button>
            <button type="reset"className="resbut">Annuler</button>
          </form>

        <div className="period-nav">
            <button className="nav-btn" onClick={() => changeMonth(-1)}>&lt;</button>
            <span className="period">{getPeriodLabel()}</span>
            <button className="nav-btn" onClick={() => changeMonth(1)}>&gt;</button>
          </div>
        </div>
        
        <div className="calendar-header">
          <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
        </div>
        <div className="calendar-grid">{generateCalendarDays()}</div>
      </div>
    </div>
  );
};

export default AdDash;

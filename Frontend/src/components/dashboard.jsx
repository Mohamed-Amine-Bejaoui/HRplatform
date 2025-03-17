import React, { useEffect, useState } from "react";
import "../Styles/dashboard.css";
import Sidebar from "./sidebar";
const Dashboard = () => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setTimeout(() => setLoaded(true), 100); // Slight delay for smooth transition
  }, []);

  return (
    <div className={`dash ${loaded ? "active" : ""}`}>
      <Sidebar />
      <h1>Dashboard</h1>
    </div>
  );
};

export default Dashboard;

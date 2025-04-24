import React, { useEffect, useState } from "react";
import "../Styles/dashboard.css";
import Sidebar from "./sidebar";
import { jwtDecode } from "jwt-decode"; // Correct import

const Dashboard = () => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
  setTimeout(() => setLoaded(true), 100);
  const storedUser = localStorage.getItem("authToken");
  const decodedToken = jwtDecode(storedUser);
  console.log(decodedToken);
  
  }, []);

  return (
    <div className={`dash ${loaded ? "active" : ""}`}>
      <Sidebar />
      <div className="dcontainer">
        <h1>Ma Préscence</h1>
      </div>
    </div>
  );
};

export default Dashboard;

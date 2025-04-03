import React, { useEffect, useState } from "react";
import "../../Styles/dashboard.css";
import SideAd from "./sideAd";
const AdDash = () => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setTimeout(() => setLoaded(true), 100); // Slight delay for smooth transition
  }, []);

  return (
    <div className={`dash ${loaded ? "active" : ""}`}>
      <SideAd />
      <div className="dcontainer">
        <h1>Dashboard Admin</h1>
      </div>
    </div>
  );
};

export default AdDash;

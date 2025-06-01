import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/login";
import Dashboard from "./components/dashboard";
import Notifs from "./components/Notifs";
import Profile from "./components/profile";
import AdDash from "./components/admin/adDash";
import ProfileAd from "./components/admin/profileAd";
import EmployeesAd from "./components/admin/employeesAd";
import NotifsAD from "./components/admin/notifsAD";
import InputsAd from "./components/admin/inputsAd";
import StatisticsDashboard from "./components/admin/statsAD";
import Signup from "./components/signup";
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard/>}/>
        <Route path="/notifs" element={<Notifs/>}/>
        <Route path="/profile" element={<Profile/>}/>
        <Route path="/admin-dashboard" element={<AdDash/>}/>
        <Route path="/profileAd" element={<ProfileAd/>}/>
        <Route path="/employeesAd" element={<EmployeesAd/>}/>
        <Route path="/notifsAd" element={<NotifsAD/>}/>
        <Route path="/statistics" element={<StatisticsDashboard/>}/>
        <Route path="/inputsAd" element={<InputsAd/>}/>


      </Routes>
    </Router>
  );
}

export default App;

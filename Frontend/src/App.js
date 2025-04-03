import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/login";
import Dashboard from "./components/dashboard";
import Salaire from "./components/salaire";
import Notifs from "./components/Notifs";
import Profile from "./components/profile";
import AdDash from "./components/admin/adDash";
import ProfileAd from "./components/admin/profileAd";
import EmployeesAd from "./components/admin/employeesAd";
import NotifsAD from "./components/admin/notifsAD";
import SalaireAD from "./components/admin/salaireAD";
import InputsAd from "./components/admin/inputsAd";
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard/>}/>
        <Route path="/salaire" element={<Salaire/>}/>
        <Route path="/notifs" element={<Notifs/>}/>
        <Route path="/profile" element={<Profile/>}/>
        <Route path="/admin-dashboard" element={<AdDash/>}/>
        <Route path="/profileAd" element={<ProfileAd/>}/>
        <Route path="/employeesAd" element={<EmployeesAd/>}/>
        <Route path="/notifsAd" element={<NotifsAD/>}/>
        <Route path="/salaireAd" element={<SalaireAD/>}/>
        <Route path="/inputsAd" element={<InputsAd/>}/>


      </Routes>
    </Router>
  );
}

export default App;

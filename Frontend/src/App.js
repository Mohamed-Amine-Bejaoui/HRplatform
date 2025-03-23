import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/login";
import Dashboard from "./components/dashboard";
import Demandes from "./components/dmandees";
import Myteam from "./components/Myteam";
import Notifs from "./components/Notifs";
import Profile from "./components/profile";
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard/>}/>
        <Route path="/demandes" element={<Demandes/>}/>
        <Route path="/teams" element={<Myteam/>}/>
        <Route path="/notifs" element={<Notifs/>}/>
        <Route path="/profile" element={<Profile/>}/>



      </Routes>
    </Router>
  );
}

export default App;

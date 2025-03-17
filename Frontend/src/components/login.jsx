import React, { useState } from "react";
import "../Styles/login.css";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const loginData = { email, password };
    console.log("Login data:", loginData);
    try {
      const response = await fetch("http://localhost:5000/user/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();

      if (response.ok) {
      
        localStorage.setItem("authToken", data.token);
        navigate("/dashboard");  
      } else {
        setError(data.message); 
        alert(data.error)
      }
    } catch (error) {
      setError("Server error. Please try again later.");
    }
  };
  return (
    <div className="wrapper">
      <div className="title-text">
        <div className="title login">Login Form</div>
      </div>
      <div className="form-container">
        <div className="form-inner">
          <form action="#" className="login" onSubmit={handleSubmit}>
            <div className="field">
              <input
                type="text"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <div className="error-message">{error}</div>}
            <div className="field btn">
              <div className="btn-layer"></div>
              <input type="submit" value="Login" />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;

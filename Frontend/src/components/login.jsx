import React, { useState } from "react";
import "../Styles/login.css";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const loginData = { email, password };
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
        const decodedToken = jwtDecode(data.token);
        localStorage.setItem("decodedToken", decodedToken);

        if (decodedToken.role === "admin") {
          navigate("/admin-dashboard");  
        } else {
          navigate("/dashboard");  
        }
      } else {
        // Handle different error types
        if (response.status === 403) {
          setError("Account pending approval. Please contact your administrator.");
        } else {
          setError(data.error || "Login failed. Please try again.");
        }
      }
    } catch (error) {
      setError("Server error. Please try again later.");
    }
  };

  const handleSignupRedirect = () => {
    navigate("/signup");
  };

  return (
    <div className="wrapper login-wrapper">
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
              <input type="submit" value="Login" style={{backgroundColor:"#0037ce"}}/>
            </div>

            <div className="signup-link">
              Don't have an account? 
              <button 
                type="button" 
                className="signup-btn"
                onClick={handleSignupRedirect}
              >
                Sign up here
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;

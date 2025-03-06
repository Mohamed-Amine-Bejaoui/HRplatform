import React, { useEffect } from "react";
import "../Styles/login.css";
import { Link } from "react-router-dom";

const Login = () => {
  useEffect(() => {
    const loginText = document.querySelector(".title-text .login");
    const loginForm = document.querySelector("form.login");
    const loginBtn = document.querySelector("label.login");
    const signupBtn = document.querySelector("label.signup");
    const signupLink = document.querySelector("form .signup-link a");

    signupBtn.addEventListener("click", () => {
      loginForm.style.marginLeft = "-50%";
      loginText.style.marginLeft = "-50%";
    });

    loginBtn.addEventListener("click", () => {
      loginForm.style.marginLeft = "0%";
      loginText.style.marginLeft = "0%";
    });

    signupLink.addEventListener("click", (event) => {
      event.preventDefault(); // Prevent page refresh
      signupBtn.click();
    });

    // Cleanup event listeners when component unmounts
    return () => {
      signupBtn.removeEventListener("click", () => {});
      loginBtn.removeEventListener("click", () => {});
      signupLink.removeEventListener("click", () => {});
    };
  }, []);

  return (
    <div className="wrapper">
      <div className="title-text">
        <div className="title login">Login Form</div>
        <div className="title signup">Signup Form</div>
      </div>
      <div className="form-container">
        <div className="slide-controls">
          <input type="radio" name="slide" id="login" defaultChecked />
          <input type="radio" name="slide" id="signup" />
          <label htmlFor="login" className="slide login">Login</label>
          <label htmlFor="signup" className="slide signup">Signup</label>
          <div className="slider-tab"></div>
        </div>
        <div className="form-inner">
          <form action="#" className="login">
            <div className="field">
              <input type="text" placeholder="Email Address" required />
            </div>
            <div className="field">
              <input type="password" placeholder="Password" required />
            </div>
            <div className="pass-link"><Link to="/forgot-password">Forgot password?</Link></div>
            <div className="field btn">
              <div className="btn-layer"></div>
              <input type="submit" value="Login" />
            </div>
            <div className="signup-link">
              Not a member? <Link to="/signup">Signup now</Link>
            </div>
          </form>
          <form action="#" className="signup">
            <div className="field">
              <input type="text" placeholder="Email Address" required />
            </div>
            <div className="field">
              <input type="password" placeholder="Password" required />
            </div>
            <div className="field">
              <input type="password" placeholder="Confirm password" required />
            </div>
            <div className="field btn">
              <div className="btn-layer"></div>
              <input type="submit" value="Signup" />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;

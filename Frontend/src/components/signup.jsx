import React, { useState } from "react";
import "../Styles/login.css";
import { useNavigate } from "react-router-dom";

const Signup = () => {
  const [formData, setFormData] = useState({
    emp_num_aux: "",
    emp_mail: "",
    emp_type_aux: "",
    emp_join_aux: "",
    contract_finish: "",
    aux_status: "0",
    isAdmin: false
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/user/addemp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("Employee registered successfully! waiting for admin approval...");
        setTimeout(() => {
          navigate("/");
        }, 2500);
      } else {
        setError(data.message || data.error || "Registration failed.email and ID must be unique.");
      }
    } catch (error) {
      setError("Server error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="wrapper signup-wrapper">
      <div className="title-text">
        <div className="title signup">Employee Registration</div>
      </div>
      
      {/* Alert Messages */}
      {error && (
        <div className="alert alert-error">
          <div className="alert-icon">⚠️</div>
          <div className="alert-content">
            <strong>Error!</strong>
            <p>{error}</p>
          </div>
          <button className="alert-close" onClick={clearMessages}>×</button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <div className="alert-icon">✅</div>
          <div className="alert-content">
            <strong>Success!</strong>
            <p>{success}</p>
          </div>
          <div className="alert-spinner"></div>
        </div>
      )}

      <div className="form-container">
        <div className="form-inner">
          <form action="#" className="signup" onSubmit={handleSubmit}>
            <div className="field">
              <input
                type="text"
                name="emp_num_aux"
                placeholder="Employee ID"
                value={formData.emp_num_aux}
                onChange={handleInputChange}
                required
                disabled={loading}
              />
            </div>

            <div className="field">
              <input
                type="email"
                name="emp_mail"
                placeholder="Email Address"
                value={formData.emp_mail}
                onChange={handleInputChange}
                required
                disabled={loading}
              />
            </div>

            <div className="field">
              <select
                name="emp_type_aux"
                value={formData.emp_type_aux}
                onChange={handleInputChange}
                required
                className="select-field"
                disabled={loading}
              >
                <option value="">Select Contract Type</option>
                <option value="CDI">CDI (Permanent Contract)</option>
                <option value="CDD">CDD (Fixed-term Contract)</option>
                <option value="CTT">CTT (Temporary Contract)</option>
                <option value="Contrat d'apprentissage">Apprenticeship</option>
                <option value="Contrat de professionnalisation">Professional Contract</option>
                <option value="CIVP">CIVP (Insertion Contract)</option>
              </select>
            </div>

            <div className="field">
              <label className="date-label">Date of Hire:</label>
              <input
                type="date"
                name="emp_join_aux"
                value={formData.emp_join_aux}
                onChange={handleInputChange}
                max={getTodayDate()}
                required
                className="date-field"
                disabled={loading}
              />
            </div>

            <div className="field">
              <label className="date-label" style={{marginTop:"40px"}}>Contract End (Optional):</label>
              <input
                type="date"
                name="contract_finish"
                value={formData.contract_finish}
                onChange={handleInputChange}
                min={formData.emp_join_aux || getTodayDate()}
                className="date-field"
                disabled={loading}
              />
            </div>

           
            <div className="field btn"style={{marginTop:"40px"}}> 
              <input 
                type="submit" 
                value={loading ? "Registering..." : "Register Employee"} 
                style={{backgroundColor: loading ? "#666" : "#0037ce"}}
                disabled={loading}
              />
              {loading && <div className="btn-spinner"></div>}
            </div>

            <div className="signup-link">
              Already have an account? 
              <button 
                type="button" 
                className="login-btn"
                onClick={() => navigate("/")}
                disabled={loading}
              >
                Login here
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;
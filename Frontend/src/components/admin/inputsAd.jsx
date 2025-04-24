import React, { useState } from 'react';
import SideAd from './sideAd';
import axios from 'axios';
import "../../Styles/notifs.css";

const InputsAd = () => {
  const [workFile, setWorkFile] = useState(null);
  const [logsFile, setLogsFile] = useState(null);
  const [workMonth, setWorkMonth] = useState("");
  const [logsMonth, setLogsMonth] = useState("");
  const [message, setMessage] = useState("");

  const handleUpload = async (type) => {
    const file = type === "work" ? workFile : logsFile;
    const month = type === "work" ? workMonth : logsMonth;
    const endpoint = type === "work"
      ? "http://localhost:5000/workplan/upload"
      : "http://localhost:5000/logsplan/upload";

    

    const formData = new FormData();
    formData.append("file", file);
    formData.append("month", month);

    try {
      const res = await axios.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage(res.data.message);
    } catch (err) {
      setMessage(`Upload failed for ${type}`);
    }
  };

  const renderMonthOptions = () =>
    [...Array(12)].map((_, index) => {
      const value = index + 1;
      const name = new Date(0, index).toLocaleString("default", { month: "long" });
      return <option key={value} value={value}>{name}</option>;
    });

  return (
    <div className="ntf">
      <SideAd />
      <div className="nfcontainer">
        <h2>Upload Attendance & Work Schedule CSV</h2>
<br />
        <div id="top_buttons">
          {/* Work File Section */}
          <div className="upload-section">
            <label htmlFor="work-upload">
              <div className="upload-box">
                <i className="bx bxs-cloud-upload upload-icon"></i>
                <div className="upload-text">
                  {workFile ? workFile.name : "Choose Work File"}
                </div>
                <div className="upload-footer">Work Excel</div>
              </div>
            </label>
            <input
              type="file"
              id="work-upload"
              onChange={(e) => setWorkFile(e.target.files[0])}
              style={{ display: "none" }}
            />
            <br /><br />
           <div className="month-select">
              <select
                value={workMonth}
                onChange={(e) => setWorkMonth(e.target.value)}
              >
                <option value="">Select Month for Work</option>
                {renderMonthOptions()}
              </select>
            </div>
            <button id="button_upload" onClick={() => handleUpload("work")}>
              Upload Work Schedule
            </button>
          </div>

          {/* Logs File Section */}
          <div className="upload-section">
            <label htmlFor="logs-upload">
              <div className="upload-box">
                <i className="bx bxs-cloud-upload upload-icon"></i>
                <div className="upload-text">
                  {logsFile ? logsFile.name : "Choose Logs File"}
                </div>
                <div className="upload-footer">Logs Excel</div>
              </div>
            </label>
            <input
              type="file"
              id="logs-upload"
              onChange={(e) => setLogsFile(e.target.files[0])}
              style={{ display: "none" }}
            />
           <br /><br />

            <div className="month-select">
              
            </div>
            <button id="button_upload" onClick={() => handleUpload("logs")}>
              Upload Attendance Logs
            </button>
          </div>
        </div>

        <div id="msg_error">{message}</div>
      </div>
    </div>
  );
};

export default InputsAd;
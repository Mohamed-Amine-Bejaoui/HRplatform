import React, { useState } from 'react';
import SideAd from './sideAd';
import axios from 'axios';
import "../../Styles/notifs.css";

const InputsAd = () => {
  const [workFiles, setWorkFiles] = useState([]);
  const [logsFiles, setLogsFiles] = useState([]);
  const [message, setMessage] = useState("");

  // New state for month-year filter and cron job
  const [monthYear, setMonthYear] = useState(""); // Format: YYYY-MM
  const [cronDate, setCronDate] = useState("");
  const [cronTime, setCronTime] = useState("");

  const handleDrop = (e, type) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (type === "work") {
      setWorkFiles(files);
    } else {
      setLogsFiles(files);
    }
  };

  const handleFileChange = (e, type) => {
    const files = Array.from(e.target.files);
    if (type === "work") {
      setWorkFiles(files);
    } else {
      setLogsFiles(files);
    }
  };

  const handleUpload = async (type) => {
    const files = type === "work" ? workFiles : logsFiles;
    const endpoint = type === "work"
      ? "http://localhost:5000/workplan/upload"
      : "http://localhost:5000/logsplan/upload";

    if (!files.length) {
      setMessage(`No ${type} files selected.`);
      return;
    }

    const formData = new FormData();
    files.forEach(file => {
      formData.append("files", file);
    });

    try {
      const res = await axios.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage(res.data.message);
    } catch (err) {
      setMessage(`Upload failed for ${type}`);
    }
  };

  const handleCronSubmit = () => {
    if (!cronDate || !cronTime) {
      setMessage("Please select both date and time for the cron job.");
      return;
    }

    // You can send this to the backend via axios if needed
    const cronPayload = {
      date: cronDate,
      time: cronTime,
      targetMonth: monthYear,
    };

    console.log("Cron Scheduled with:", cronPayload);
    setMessage(`Cron job set for ${cronDate} at ${cronTime} targeting ${monthYear}`);
  };

  const renderFileNames = (files) =>
    files.length ? files.map(f => <div key={f.name}>{f.name}</div>) : "Drop or select files";

  return (
    <div className="ntf">
      <SideAd />
      <div className="nfcontainer">
        <h2>Upload Attendance & Work Schedule Files</h2>

        {/* Month-Year and Cron Setup Form */}
        {/* Month-Year and Cron Activation Section */}
<div id="top_buttons">
          {/* Work Files Upload Section */}
          <div
            className="upload-section"
            onDrop={(e) => handleDrop(e, "work")}
            onDragOver={(e) => e.preventDefault()}
          >
            <label htmlFor="work-upload">
              <div className="upload-box">
                <i className="bx bxs-cloud-upload upload-icon"></i>
                <div className="upload-text">
                  {renderFileNames(workFiles)}
                </div>
                <div className="upload-footer">Work Files</div>
              </div>
            </label>
            <input
              type="file"
              id="work-upload"
              multiple
              onChange={(e) => handleFileChange(e, "work")}
              style={{ display: "none" }}
            />
            <h4>work schedule</h4>
            <button id="button_upload" onClick={() => handleUpload("work")}>
              Upload Work Files
            </button>
          </div>

          {/* Logs Files Upload Section */}
          <div
            className="upload-section"
            onDrop={(e) => handleDrop(e, "logs")}
            onDragOver={(e) => e.preventDefault()}
          >
            <label htmlFor="logs-upload">
              <div className="upload-box">
                <i className="bx bxs-cloud-upload upload-icon"></i>
                <div className="upload-text">
                  {renderFileNames(logsFiles)}
                </div>
                <div className="upload-footer">Logs Files</div>
              </div>
            </label>
            <input
              type="file"
              id="logs-upload"
              multiple
              onChange={(e) => handleFileChange(e, "logs")}
              style={{ display: "none" }}
            />
            <h4>Logs</h4>
            <button id="button_upload" onClick={() => handleUpload("logs")}>
              Upload Logs Files
            </button>
          </div>
        </div>
<div className="top-form">
  <h3>Settings</h3>
  <div className="form-row">
    <div className="form-group">
      <label htmlFor="month-year">Target Month</label>
      <input type="month" id="month-year" className="form-control" />
    </div>
    <div className="form-group">
      <label htmlFor="cron-date">Cron Date</label>
      <input type="date" id="cron-date" className="form-control" />
    </div>
    <div className="form-group">
      <label htmlFor="cron-time">Cron Hour</label>
      <input type="time" id="cron-time" className="form-control" />
    </div>
    <button className="cron-btn">Validate</button>
  </div>
</div>
  
        
        <div id="msg_error">{message}</div>

      </div>

    </div>
  );
};

export default InputsAd;

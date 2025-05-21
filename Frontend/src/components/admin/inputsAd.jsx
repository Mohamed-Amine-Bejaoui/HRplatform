import React, { useState } from 'react';
import SideAd from './sideAd';
import axios from 'axios';
import "../../Styles/notifs.css";

const InputsAd = () => {
  const [workFiles, setWorkFiles] = useState([]);
  const [logsFiles, setLogsFiles] = useState([]);
  const [message, setMessage] = useState("");
  const [monthYear, setMonthYear] = useState("");
  const [cronDate, setCronDate] = useState("");
  const [cronTime, setCronTime] = useState("");
  const [isScheduling, setIsScheduling] = useState(false);

  const handleDrop = (e, type) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    type === "work" ? setWorkFiles(files) : setLogsFiles(files);
  };

  const handleFileChange = (e, type) => {
    const files = Array.from(e.target.files);
    type === "work" ? setWorkFiles(files) : setLogsFiles(files);
  };

  const handleUpload = async (type) => {
    const files = type === "work" ? workFiles : logsFiles;
    if (!files.length) {
      setMessage(`No ${type} files selected.`);
      return;
    }

    const endpoint = `http://localhost:5000/${type}plan/upload`;
    const formData = new FormData();
    files.forEach(file => formData.append("files", file));

    try {
      await axios.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage(`✅ ${type === "work" ? "Work" : "Logs"} files uploaded!`);
      type === "work" ? setWorkFiles([]) : setLogsFiles([]);
    } catch (err) {
      setMessage(`❌ ${type} upload failed: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleCronSubmit = async () => {
    if (!cronDate || !cronTime || !monthYear) {
      setMessage("⚠️ Please select date, time, and target month.");
      return;
    }

    setIsScheduling(true);
    setMessage("⏳ Scheduling jobs...");

    try {
      const [workRes, logsRes] = await Promise.all([
        axios.post("http://localhost:5000/workplan/process-cron", {
          date: cronDate,
          time: cronTime,
          targetMonth: monthYear
        }),
        axios.post("http://localhost:5000/logsplan/process-cron", {
          date: cronDate,
          time: cronTime,
          targetMonth: monthYear
        })
      ]);

      setMessage(`
        ✅ Cron jobs scheduled successfully!
        Work: ${workRes.data.note} (${workRes.data.cronExpression})
        Logs: ${logsRes.data.note} (${logsRes.data.cronExpression})
      `);
      
      setCronDate("");
      setCronTime("");
      setMonthYear("");
    } catch (err) {
      setMessage(`❌ Failed to schedule: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsScheduling(false);
    }
  };

  const renderFileNames = (files) =>
    files.length ? files.map(f => <div key={f.name}>{f.name}</div>) : "Drop or select files";

  return (
    <div className="ntf">
      <SideAd />
      <div className="nfcontainer">
        <h2>Upload Attendance & Work Schedule Files</h2>

        <div id="top_buttons">
          {/* Work Files Section */}
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
            <h4>Work Schedule Logs</h4>
            <button id="button_upload" onClick={() => handleUpload("work")}>
              Upload Work Files
            </button>
          </div>

          {/* Logs Files Section */}
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
            <h4>Machine Logs</h4>
            <button id="button_upload" onClick={() => handleUpload("logs")}>
              Upload Logs Files
            </button>
          </div>
        </div>

        {/* Cron Settings Section */}
        <div className="top-form">
          <h3>Settings</h3>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="month-year">Target Month</label>
              <input
                type="month"
                id="month-year"
                className="form-control"
                value={monthYear}
                onChange={(e) => setMonthYear(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="cron-date">Cron Date</label>
              <input
                type="date"
                id="cron-date"
                className="form-control"
                value={cronDate}
                onChange={(e) => setCronDate(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="cron-time">Cron Time</label>
              <input
                type="time"
                id="cron-time"
                className="form-control"
                value={cronTime}
                onChange={(e) => setCronTime(e.target.value)}
                required
              />
            </div>
            <button 
              className="cron-btn" 
              onClick={handleCronSubmit}
              disabled={isScheduling}
            >
              {isScheduling ? 'Scheduling...' : 'Validate Cron for Both'}
            </button>
          </div>
        </div>

        <div id="msg_error">{message}</div>
      </div>
    </div>
  );
};

export default InputsAd;
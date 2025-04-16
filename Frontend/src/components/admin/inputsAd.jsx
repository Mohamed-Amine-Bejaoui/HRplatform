import React, { useState } from 'react';
import SideAd from './sideAd';
import axios from 'axios';
import "../../Styles/notifs.css";

const InputsAd = () => {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(""); // NEW

  const handleUpload = async () => {
    if (!file || !selectedMonth) {
      setMessage("Please select both a file and a month.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("month", selectedMonth); // NEW

    try {
      const res = await axios.post("http://localhost:5000/workplan/upload", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setMessage(res.data.message);
    } catch (err) {
      setMessage("Upload failed");
    }
  };

  return (
    <div className='ntf'>
      <SideAd />
      <div className="nfcontainer">
        <h2>Upload Attendance CSV</h2>
        <input type="file" onChange={(e) => setFile(e.target.files[0])} />
        
        {/* NEW: Month Select */}
        <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
          <option value="">Select Month</option>
          {[...Array(12)].map((_, index) => {
            const monthValue = index + 1;
            const monthName = new Date(0, index).toLocaleString('default', { month: 'long' });
            return <option key={monthValue} value={monthValue}>{monthName}</option>;
          })}
        </select>

        <button onClick={handleUpload}>Upload</button>
        <div>{message}</div>
      </div>
    </div>
  );
};

export default InputsAd;

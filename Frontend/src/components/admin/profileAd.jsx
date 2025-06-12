import React, { useEffect, useState } from 'react';
import axios from 'axios';
import SideAd from './sideAd';
import '../../Styles/profile.css';
import { jwtDecode } from "jwt-decode";

const ProfileAd = () => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  const storedUser = localStorage.getItem("authToken");
  const decodedToken = jwtDecode(storedUser);
  const empNumAux=decodedToken.emp_num_aux
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/profileplan/profile?numaux=${empNumAux}`);
        setProfileData(res.data);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [empNumAux]);

  if (loading) return <div className="prf"><SideAd /><div className="prcontainer">Loading...</div></div>;
  if (!profileData) return <div className="prf"><SideAd /><div className="prcontainer">No data found</div></div>;

  return (
    <div className="prf">
      <SideAd />
      <div className="prcontainer">
        <h1>Profile</h1>
        <br></br>
        <div className="profile-card">
        <div className="profile-row"><span className="label">ID:</span><span>{profileData.emp_num_aux}</span></div>

        <div className="profile-row"><span className="label">Email:</span><span>{profileData.emp_mail}</span></div>
          <div className="profile-row"><span className="label">Name:</span><span>{profileData.name}</span></div>
          <div className="profile-row"><span className="label">Type:</span><span>{profileData.emp_type_aux}</span></div>
          <div className="profile-row"><span className="label">Date of Hire:</span>
          <span>{new Date(profileData.emp_join_aux).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}</span>
        </div>
          <div className="profile-row"><span className="label">Contract End Date:</span>
          <span>{profileData.contract_finish ?
          new Date(profileData.contract_finish).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }):""
    }</span></div>
          <div className="profile-row">
            <span className="label">Status:</span>
            <span className={profileData.aux_status === 1 ? "active" : "inactive"}>
              {profileData.aux_status === 1 ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileAd;

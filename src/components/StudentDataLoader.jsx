import React from 'react';
import './StudentDataLoader.css';
import studentReadingImage from '../assets/load.png'; // Assuming the image is saved here

const StudentDataLoader = () => {
  return (
    <div className="loading-overlay fade-in">
      <div className="loading-popup">
        <div className="loader-wrapper">
          <img src={studentReadingImage} alt="Student Reading" className="student-reading-image" />
          <div className="circular-loader"></div>
        </div>
        <p className="loading-text">Loading your content...</p>
      </div>
    </div>
  );
};

export default StudentDataLoader;

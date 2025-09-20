import React from 'react';
import PropTypes from 'prop-types';
import { FaLock, FaBook } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { courses } from '../../utils/courses'; // Import the centralized course data

export default function UnlockableCourses({ userPoints, unlockedCourses }) {
  const navigate = useNavigate();

  const handleCourseClick = (course) => {
    if (userPoints >= course.requiredPoints) {
      const courseId = course.name.toLowerCase().replace(/\s+/g, '-');
      navigate(`/student/course/${courseId}`);
    }
  };
  return (
    <div className="unlockable-courses-section">
      <h3 className="gradient-text">Unlockable Courses</h3>
      <div className="courses-grid">
        {courses.map((course, index) => {
          const isUnlocked = userPoints >= course.requiredPoints || unlockedCourses.includes(course.id);
          return (
            <button 
              key={index} 
              className={`course-button ${isUnlocked ? 'unlocked' : 'locked'}`}
              onClick={() => handleCourseClick(course)}
              disabled={!isUnlocked}
            >
              <div className="course-icon">
                {isUnlocked ? <FaBook /> : <FaLock />}
              </div>
              <div className="course-details">
                <h4>{course.name}</h4>
                {!isUnlocked && (
                  <p className="unlock-requirement">{course.requiredPoints} Points to Unlock</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

UnlockableCourses.propTypes = {
  userPoints: PropTypes.number.isRequired,
  unlockedCourses: PropTypes.array.isRequired,
};

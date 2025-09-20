import { Link, Outlet, useLocation, useParams } from 'react-router-dom'
import TeacherClassesDropdown from './ClassesDropdown'
import { FaHome, FaInbox, FaBook, FaTasks, FaUsers, FaBell, FaUserEdit, FaSearch, FaChalkboardTeacher, FaEllipsisV, FaBars, FaAngleLeft } from 'react-icons/fa'
import { MdOutlineSchool } from "react-icons/md"
import { RiDashboardLine } from "react-icons/ri";
import { useEffect, useState } from 'react' // Import useEffect and useState
import { auth, db } from '../../firebase-config' // Import auth and db
import { doc, getDoc, collection, query, where, getDocs, arrayRemove, updateDoc } from 'firebase/firestore' // Import doc and getDoc
import { FaTrash, FaUserCircle } from 'react-icons/fa' // Import FaTrash and FaUserCircle for students list
import AIChatPopup from '../../components/AIChatPopup' // Import AIChatPopup
import { useTranslation } from 'react-i18next'; // Import useTranslation




export default function TeacherLayout() {
	const { t, i18n } = useTranslation(); // Initialize useTranslation
	const location = useLocation()
	const { classId } = useParams() // Get classId from URL parameters
	console.log("Current Pathname:", location.pathname); // Debugging
	console.log("Class ID:", classId); // Debugging
	const [displayName, setDisplayName] = useState('') // State for dynamic display name
	const [teacherClasses, setTeacherClasses] = useState([]) // New state for teacher's classes
	const [myStudents, setMyStudents] = useState([]) // New state for students enrolled in teacher's classes
	const [isSidebarOpen, setIsSidebarOpen] = useState(true); // State for sidebar visibility
	const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true); // State for right sidebar visibility

	useEffect(() => {
		const fetchTeacherData = async () => {
			const user = auth.currentUser
			if (!user) return

			// Fetch teacher's display name
			const userDocRef = doc(db, 'users', user.uid)
			const userSnap = await getDoc(userDocRef)
			if (userSnap.exists()) {
				setDisplayName(userSnap.data().displayName || '')
			}

			// Fetch classes created by this teacher
			const classesRef = collection(db, 'classes');
			const qClasses = query(classesRef, where('teacherId', '==', user.uid));
			const classesSnap = await getDocs(qClasses);
			const classesCreatedByTeacher = classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
			setTeacherClasses(classesCreatedByTeacher);

			const teacherClassIds = classesCreatedByTeacher.map(cls => cls.id);

			// Fetch students enrolled in these classes
			if (teacherClassIds.length > 0) {
				const studentsRef = collection(db, 'users');
				const qStudents = query(studentsRef, where('role', '==', 'student'));
				const studentsSnap = await getDocs(qStudents);

				const enrolledStudentsData = [];
				studentsSnap.forEach(studentDoc => {
					const studentData = studentDoc.data();

					// Check if the student is enrolled in ANY of the teacher's classes AND has submitted a quiz for that class
					const enrolledInTeacherClassAndSubmittedQuiz = studentData.enrolledClasses &&
						studentData.enrolledClasses.some(enrolledClassId => {
							if (teacherClassIds.includes(enrolledClassId)) {
								// Now also check if they have submitted a quiz for this specific class
								const hasSubmittedQuizForClass = (studentData.attemptedQuizzes || []).some(
									quiz => quiz.classId === enrolledClassId
								);
								return hasSubmittedQuizForClass;
							}
							return false;
						});

					if (enrolledInTeacherClassAndSubmittedQuiz) {
						enrolledStudentsData.push({
							id: studentDoc.id,
							displayName: studentData.displayName || 'Anonymous',
							totalPoints: studentData.totalPoints || 0,
							enrolledClasses: studentData.enrolledClasses.filter(enrolledClassId => teacherClassIds.includes(enrolledClassId)), // Show only relevant classes
						});
					}
				});
				setMyStudents(enrolledStudentsData);
			} else {
				setMyStudents([]); // No classes, no students
			}

		}
		fetchTeacherData()
	}, [auth.currentUser])

	const handleRemoveStudent = async (studentId, classToRemoveId) => {
		if (!confirm(`Are you sure you want to remove this student from class ${classToRemoveId}?`)) return;

		try {
			const studentRef = doc(db, 'users', studentId);
			await updateDoc(studentRef, {
				enrolledClasses: arrayRemove(classToRemoveId)
			});

			const studentSnap = await getDoc(studentRef);
			if (studentSnap.exists()) {
				const studentData = studentSnap.data();
				const updatedAttemptedQuizzes = (studentData.attemptedQuizzes || []).filter(
					(quiz) => quiz.classId !== classToRemoveId
				);
				await updateDoc(studentRef, { attemptedQuizzes: updatedAttemptedQuizzes });
			}

			// Refresh the students list by re-fetching all data
			// Call the fetch function directly, as it's a dependency of useEffect
			auth.currentUser && (await fetchTeacherData()); // Re-fetch if user is still logged in
			alert('Student removed successfully!');
		} catch (error) {
			console.error("Error removing student:", error);
			alert('Failed to remove student. Please try again.');
		}
	};

	const toggleSidebar = () => {
		setIsSidebarOpen(!isSidebarOpen);
	};

	const toggleRightSidebar = () => {
		setIsRightSidebarOpen(!isRightSidebarOpen);
	};

	return (
		<div className={`teacher-layout ${isSidebarOpen ? '' : 'sidebar-closed'} ${isRightSidebarOpen ? '' : 'right-sidebar-closed'}`}>
			<aside className="side-nav">
				<div className="logo-section">
					<MdOutlineSchool size={30} color="var(--primary-color)" />
					<h3>LEARNY</h3>
					<button onClick={toggleSidebar} className="sidebar-toggle-btn">
						{isSidebarOpen ? <FaAngleLeft style={{ transform: 'rotate(180deg)' }} /> : <FaAngleLeft />} {/* Changed to FaAngleLeft and added conditional rotation */} 
					</button>
				</div>
				<nav>
					<h4>{t("overview")}</h4>
					<Link to="/teacher" className={location.pathname === '/teacher' ? 'active' : ''}><RiDashboardLine />{t("dashboard")}</Link>
					{/* <Link to="/teacher/inbox" className={location.pathname === '/teacher/inbox' ? 'active' : ''}><FaInbox />{t("inbox")}</Link> */}
					{/* <Link to="/teacher/lessons" className={location.pathname === '/teacher/lessons' ? 'active' : ''}><FaBook />{t("lessons")}</Link> */}
					<Link to="/teacher/tasks" className={location.pathname === '/teacher/tasks' ? 'active' : ''}><FaTasks />{t("tasks")}</Link>
					<Link to="/teacher/daily-quizzes" className={location.pathname === '/teacher/daily-quizzes' ? 'active' : ''}><FaTasks />{t("dailyQuizzes")}</Link>
					{/* <Link to="/teacher/performance" className={location.pathname === '/teacher/performance' ? 'active' : ''}><FaTasks />{t("performance")}</Link> */}
					<Link to="/teacher/community" className={location.pathname === '/teacher/community' ? 'active' : ''}><FaUsers />{t("community")}</Link>
					<Link to="/teacher/create-class" className={location.pathname === '/teacher/create-class' ? 'active' : ''}><FaChalkboardTeacher />{t("createClass")}</Link>
					<Link to="/teacher/notifications" className={location.pathname === '/teacher/notifications' ? 'active' : ''}><FaBell />{t("notifications")}</Link>
					<Link to="/teacher/profile" className={location.pathname === '/teacher/profile' ? 'active' : ''}><FaUserEdit />{t("profileEdit")}</Link>
				</nav>
				<div className="flex-grow"></div> {/* Pushes dropdown to bottom */}
				<TeacherClassesDropdown />
				<div className="language-switcher">
					<label htmlFor="language-select" className="sr-only">{t("selectLanguage")}</label>
					<select id="language-select" onChange={(e) => i18n.changeLanguage(e.target.value)} value={i18n.language}>
						<option value="en">{t("english")}</option>
						<option value="te">{t("telugu")}</option>
						<option value="or">{t("odia")}</option>
						<option value="ta">{t("tamil")}</option>
						<option value="hi">{t("hindi")}</option>
					</select>
				</div>
			</aside>
			<main>
				<div className="top-bar">
					<div className="search-bar">
						<FaSearch color="var(--text-color-secondary)" />
						<input type="text" placeholder={t("searchCoursePlaceholder")} />
					</div>
				</div>
				<Outlet />
			</main>
			{location.pathname.startsWith('/teacher/class/') && classId ? (
				<AIChatPopup classId={classId} />
			) : (
				<aside className={`right-sidebar ${isRightSidebarOpen ? '' : 'right-sidebar-closed'}`}>
					<div className="right-sidebar-header">
						{/* Removed h3 from here */}
						<button onClick={toggleRightSidebar} className="sidebar-toggle-btn">
							{isRightSidebarOpen ? <FaAngleLeft /> : <FaAngleLeft style={{ transform: 'rotate(180deg)' }} />} {/* Changed to FaAngleLeft and added rotation */} 
						</button>
					</div>

					{/* Conditionally render Profile Card and My Students Section only on the dashboard */}
					{location.pathname === '/teacher' && (
						<>
							{/* Profile Card */}
							<div className="profile-card">
								<h3>{t("yourProfile")}</h3> {/* Moved h3 here */}
								<div className="profile-avatar-wrapper">
									<svg className="profile-progress-ring" width="100" height="100">
										<circle
											stroke="#eee"
											strokeWidth="5"
											fill="transparent"
											r="45"
											cx="50"
											cy="50"
										/>
										<circle
											stroke="url(#profileGradient)"
											strokeWidth="5"
											fill="transparent"
											r="45"
											cx="50"
											cy="50"
										/>
										<defs>
											<linearGradient id="profileGradient" x1="0%" y1="0%" x2="100%" y2="100%">
												<stop offset="0%" stopColor="var(--primary-color)" />
												<stop offset="100%" stopColor="var(--accent-color)" />
											</linearGradient>
										</defs>
									</svg>
									<img className="profile-avatar" src="/vite.svg" alt="User Avatar" /> {/* Changed path for Vite default SVG */} 
								</div>
								<h4>{t("goodMorning")}{displayName || t("teacher")}</h4>
								<p>{t("continueJourney")}</p>
							</div>

							{/* My Students Section */}
							<div className="my-students-section-dashboard">
								<h3>{t("myStudents")}{myStudents.length})</h3>
								{myStudents.length === 0 ? (
									<p className="content-placeholder">{t("noStudentsEnrolled")}</p>
								) : (
									<div className="my-students-list">
										{myStudents.map(student => (
											<div key={student.id} className="student-item-card">
												<FaUserCircle className="student-icon" />
												<span className="student-name">{student.displayName}</span>
												<span className="student-points">{student.totalPoints} XP</span>
												{student.enrolledClasses.length > 0 && (
													<button onClick={() => handleRemoveStudent(student.id, student.enrolledClasses[0])} className="icon-btn delete-icon" title={t("removeStudent")}>
														<FaTrash />
													</button>
												)}
											</div>
										))}
									</div>
								)}
							</div>
						</>
					)}
				</aside>
			)}
		</div>
	)
}



import { useParams, Outlet, Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { doc, onSnapshot, getDoc } from 'firebase/firestore'
import { db } from '../../firebase-config'
import { FaBookOpen, FaFolderOpen, FaChevronDown, FaChevronUp, FaChartBar, FaTasks, FaBell, FaBook, FaImages, FaPlayCircle, FaRegFileAlt, FaLaptopCode } from 'react-icons/fa' // Import additional icons
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'; // Import Recharts components
import { auth } from '../../firebase-config'; // Import auth for current user
import StudentDataLoader from '../../components/StudentDataLoader'

export function StudentClassContent() {
	const { classId, chapterId, topicId } = useParams();
	const [topicDetails, setTopicDetails] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [activeTab, setActiveTab] = useState('note');

	useEffect(() => {
		console.log("StudentClassContent useEffect triggered.");
		console.log("URL Params: ", { classId, chapterId, topicId });
		if (!classId || !chapterId || !topicId) {
			console.log("Missing URL parameters, setting loading to false.");
			setLoading(false);
			return;
		}

		const fetchTopicContent = async () => {
			setLoading(true);
			setError(null); // Clear previous errors
			console.log("Fetching topic content...");
			try {
				const classDocRef = doc(db, 'classes', classId);
				const unsub = onSnapshot(classDocRef, (docSnap) => {
					if (docSnap.exists()) {
						const classData = docSnap.data();
						console.log("Class Data fetched: ", classData);
						const currentChapter = classData.chapters?.find(ch => ch.id === chapterId);
						console.log("Found Chapter: ", currentChapter);
						const currentTopic = currentChapter?.topics?.find(t => t.id === topicId);
						console.log("Found Topic: ", currentTopic);

						if (currentTopic) {
							setTopicDetails(currentTopic);
							console.log("Topic Details set: ", currentTopic);
						} else {
							setError("Topic not found.");
							console.error("Error: Topic not found for chapterId:", chapterId, "topicId:", topicId);
						}
					} else {
						setError("Class not found.");
						console.error("Error: Class not found for classId:", classId);
					}
					setLoading(false);
				}, (err) => {
					console.error("Error fetching topic content:", err);
					setError("Failed to load topic content.");
					setLoading(false);
				});
				return () => unsub();
			} catch (err) {
				console.error("Error in fetchTopicContent try block:", err);
				setError("An unexpected error occurred.");
				setLoading(false);
			}
		};
		fetchTopicContent();
	}, [classId, chapterId, topicId]);

	// Helper to extract YouTube video ID
	const getYoutubeVideoId = (url) => {
		if (!url || typeof url !== 'string') return null;
		const regExp = /^(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
		const match = url.match(regExp);
		return (match && match[1].length === 11) ? match[1] : null;
	};

	if (loading) return <StudentDataLoader />;
	if (error) return <div className="student-main-content error">Error: {error}</div>;
	if (!topicDetails) return <div className="student-main-content content-placeholder">Select a topic to view its content.</div>;

	const { noteContent, videos, slides, docs, exercises, name } = topicDetails;

	return (
		<div className="student-topic-content-container fade-in">
			<div className="student-topic-header">
				<h2>{name || 'Unknown Topic'}</h2>
				<p>Explore the materials for this topic.</p>
			</div>
			<div className="student-content-tabs">
				<div
					className={`student-tab-item ${activeTab === 'note' ? 'active' : ''}`}
					onClick={() => setActiveTab('note')}
				>
					<FaBook /> Note <span className="count">{noteContent ? 1 : 0}</span>
				</div>
				<div
					className={`student-tab-item ${activeTab === 'slide' ? 'active' : ''}`}
					onClick={() => setActiveTab('slide')}
				>
					<FaImages /> Slide <span className="count">{slides?.length || 0}</span>
				</div>
				<div
					className={`student-tab-item ${activeTab === 'video' ? 'active' : ''}`}
					onClick={() => setActiveTab('video')}
				>
					<FaPlayCircle /> Video <span className="count">{videos?.length || 0}</span>
				</div>
				<div
					className={`student-tab-item ${activeTab === 'docs' ? 'active' : ''}`}
					onClick={() => setActiveTab('docs')}
				>
					<FaRegFileAlt /> Docs <span className="count">{docs?.length || 0}</span>
				</div>
				<div
					className={`student-tab-item ${activeTab === 'quiz' ? 'active' : ''}`}
					onClick={() => setActiveTab('quiz')}
				>
					<FaLaptopCode /> Quiz <span className="count">{exercises?.length || 0}</span>
				</div>
			</div>

			<div className="student-tab-content">
				{activeTab === 'note' && (
					<div className="note-content" dangerouslySetInnerHTML={{ __html: noteContent }}></div>
				)}
				{activeTab === 'slide' && (
					<div className="slide-content-grid fade-in">
						{slides && slides.length === 0 ? (
							<p className="content-placeholder">No slides available for this topic.</p>
						) : (
							slides?.map((slide, index) => (
								<div key={index} className="slide-item card-item">
									{slide.url && <img src={slide.url} alt={`Slide ${index + 1}`} className="slide-image" />}
									<p className="slide-title">{slide.name || `Slide ${index + 1}`}</p>
								</div>
							))
						)}
					</div>
				)}
				{activeTab === 'video' && (
					<div className="student-video-grid fade-in">
						{videos && videos.length === 0 ? (
							<p className="content-placeholder">No videos available for this topic.</p>
						) : (
							videos?.map((video, index) => {
								const youtubeVideoId = video.type === 'youtube' ? getYoutubeVideoId(video.url) : null;
								return (
									<div key={index} className="student-video-item card-item">
										{video.type === 'youtube' && youtubeVideoId ? (
											<iframe
												width="100%"
												height="180"
												src={`https://www.youtube.com/embed/${youtubeVideoId}`}
												frameBorder="0"
												allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
												allowFullScreen
												title="YouTube video player"
											>
											</iframe>
										) : video.type === 'upload' ? (
											<video width="100%" height="180" controls className="uploaded-video">
												<source src={video.url} type="video/mp4" />
												Your browser does not support the video tag.
											</video>
										) : (
											<p className="content-placeholder">Invalid video URL or type for: {video.url}</p>
										)}
										<p className="video-title">{video.name || `Video ${index + 1}`}</p>
									</div>
								);
							})
						)}
					</div>
				)}
				{activeTab === 'docs' && (
					<div className="doc-content-grid fade-in">
						{docs && docs.length === 0 ? (
							<p className="content-placeholder">No documents available for this topic.</p>
						) : (
							docs?.map((docItem, index) => (
								<a href={docItem.url} target="_blank" rel="noopener noreferrer" key={index} className="doc-item card-item">
									<FaRegFileAlt className="doc-icon" />
									<span className="doc-name">{docItem.name || `Document ${index + 1}`}</span>
								</a>
							))
						)}
					</div>
				)}
				{activeTab === 'quiz' && (
					<div className="quiz-content-container fade-in">
						{exercises && exercises.length === 0 ? (
							<p className="content-placeholder">No quizzes or exercises created yet for this topic.</p>
						) : (
							<div className="exercises-grid">
								{exercises?.map(exercise => (
									<Link
										key={exercise.id}
										to={`/student/class/${classId}/content/chapter/${chapterId}/topic/${topicId}/exercise/${exercise.id}`}
										className="exercise-card card-item"
									>
										<FaLaptopCode className="exercise-icon" />
										<div>
											<h3>{exercise.title}</h3>
											<p className="exercise-meta">Created: {new Date(exercise.createdAt).toLocaleDateString()}</p>
										</div>
									</Link>
								))}
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
export function StudentClassSubmissions() {
	const { classId } = useParams();
	const [submissions, setSubmissions] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const currentUser = auth.currentUser; // Get current user
	const [performanceChartData, setPerformanceChartData] = useState([]); // New state for pie chart data

	useEffect(() => {
		if (!classId || !currentUser) return;

		const fetchSubmissions = async () => {
			try {
				setLoading(true);
				const userRef = doc(db, 'users', currentUser.uid);
				const userSnap = await getDoc(userRef);

				if (userSnap.exists()) {
					const userData = userSnap.data();
					const allAttemptedQuizzes = userData.attemptedQuizzes || [];
					const classQuizzes = allAttemptedQuizzes.filter(q => q.classId === classId);

					const detailedSubmissions = await Promise.all(classQuizzes.map(async (attempt) => {
						const classDocRef = doc(db, 'classes', attempt.classId);
						const classDocSnap = await getDoc(classDocRef);

						if (classDocSnap.exists()) {
							const classData = classDocSnap.data();
							const chapter = classData.chapters?.find(ch => ch.id === attempt.chapterId);
							const topic = chapter?.topics?.find(t => t.id === attempt.topicId);
							const exercise = topic?.exercises?.find(ex => ex.id === attempt.exerciseId);

							if (exercise) {
								const totalPoints = exercise.questions.reduce((sum, q) => sum + q.points, 0);
								return {
									...attempt,
									exerciseTitle: exercise.title,
									totalPoints: totalPoints,
									chapterName: chapter?.name,
									topicName: topic?.name,
								};
							}
						}
						return { ...attempt, exerciseTitle: 'Unknown Exercise', totalPoints: 0 };
					}));
					setSubmissions(detailedSubmissions);

					// Calculate performance data for the pie chart based on scores
					let totalAchievedScore = 0;
					let totalMaxPossibleScore = 0;

					// Use detailedSubmissions to sum up scores and max points
					detailedSubmissions.forEach(submission => {
						totalAchievedScore += submission.score;
						totalMaxPossibleScore += submission.totalPoints;
					});

					const chartData = [];
					if (totalMaxPossibleScore > 0) {
						chartData.push({ name: 'Achieved Score', value: totalAchievedScore });
						chartData.push({ name: 'Remaining Possible Score', value: totalMaxPossibleScore - totalAchievedScore });
					} else {
						chartData.push({ name: 'No Data', value: 1 }); // Fallback for no data
					}
					setPerformanceChartData(chartData);

				} else {
					console.log("Student user data not found.");
				}
			} catch (err) {
				console.error("Error fetching student submissions:", err);
				setError("Failed to load submissions.");
			} finally {
				setLoading(false);
			}
		};

		fetchSubmissions();
	}, [classId, currentUser]);

	const COLORS = ['#0088FE', '#FFBB28']; // Blue for achieved, Yellow for remaining

	if (loading) {
		return <StudentDataLoader />;
	}

	if (error) {
		return <div className="student-main-content error">Error: {error}</div>;
	}

	const totalDisplayScore = performanceChartData.reduce((sum, entry) => entry.name !== 'No Data' ? sum + entry.value : sum, 0);

	return (
		<div className="student-main-content fade-in">
			<h3 className="section-title">Your Submissions</h3>

			{(performanceChartData.length > 0 && totalDisplayScore > 0) ? (
				<div className="submissions-summary-chart card-item">
					<h4>Overall Quiz Performance</h4>
					<ResponsiveContainer width="100%" height={200}>
						<PieChart>
							<Pie
								data={performanceChartData}
								cx="50%"
								cy="50%"
								labelLine={false}
								outterRadius={70}
								fill="#8884d8"
								dataKey="value"
								label={({ name, value, percent }) => 
									name === 'No Data' ? 'No Data' : `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
								}
							>
								{performanceChartData.map((entry, index) => (
									<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
								))}
							</Pie>
							<Tooltip formatter={(value, name) => [`${value} points`, name]} />
						</PieChart>
					</ResponsiveContainer>
				</div>
			) : (
				// Only show this if there are no submissions to show performance for
				<p className="content-placeholder">No quiz attempts recorded yet for this class to display overall performance.</p>
			)}

			{submissions.length === 0 ? (
				<p className="content-placeholder">You have not submitted any quizzes for this class yet.</p>
			) : (
				<ul className="submissions-list card-item">
					<h4>Detailed Submissions</h4>
					{submissions.map((submission, index) => (
						<li key={index} className="submission-item">
							<h4>{submission.exerciseTitle}</h4>
							<p>Chapter: {submission.chapterName || 'N/A'}</p>
							<p>Topic: {submission.topicName || 'N/A'}</p>
							<p>Score: {submission.score} / {submission.totalPoints}</p>
							<p>Date: {new Date(submission.timestamp).toLocaleDateString()}</p>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

export function StudentClassLeaderboard() {
	const { classId } = useParams();
	const [leaderboardData, setLeaderboardData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		if (!classId) return;

		const fetchLeaderboard = async () => {
			try {
				setLoading(true);
				const usersRef = collection(db, 'users');
				const q = query(usersRef);
				const querySnapshot = await getDocs(q);

				const students = [];
				querySnapshot.forEach(doc => {
					const userData = doc.data();
					if (userData.role === 'student' && userData.enrolledClasses?.includes(classId)) {
						const totalScore = userData.attemptedQuizzes
							.filter(q => q.classId === classId)
							.reduce((sum, q) => sum + q.score, 0);
						students.push({
							id: doc.id,
							displayName: userData.displayName || 'Anonymous',
							totalScore: totalScore,
						});
					}
				});

				students.sort((a, b) => b.totalScore - a.totalScore);
				setLeaderboardData(students);
			} catch (err) {
				console.error("Error fetching leaderboard data:", err);
				setError("Failed to load leaderboard data.");
			} finally {
				setLoading(false);
			}
		};

		fetchLeaderboard();
	}, [classId]);

	if (loading) {
		return <StudentDataLoader />;
	}

	if (error) {
		return <div className="student-main-content error">Error: {error}</div>;
	}

	return (
		<div className="student-main-content fade-in">
			<h3 className="section-title">Class Leaderboard</h3>
			<div className="leaderboard-container card-item">
				{leaderboardData.length === 0 ? (
					<p className="content-placeholder">No students have attempted quizzes for this class yet.</p>
				) : (
					<ol className="leaderboard-list">
						{leaderboardData.map((student, index) => (
							<li key={student.id} className="leaderboard-item">
								<span className="rank">#{index + 1}</span>
								<span className="student-name">{student.displayName}</span>
								<span className="student-score">{student.totalScore} points</span>
							</li>
						))}
					</ol>
				)}
			</div>
		</div>
	);
}

export function StudentPerformanceView() {
	const { classId } = useParams();
	const [performanceData, setPerformanceData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const currentUser = auth.currentUser; // Get current user

	useEffect(() => {
		if (!classId || !currentUser) return;

		const fetchPerformanceData = async () => {
			try {
				setLoading(true);
				const userRef = doc(db, 'users', currentUser.uid);
				const userSnap = await getDoc(userRef);

				if (userSnap.exists()) {
					const userData = userSnap.data();
					const attemptedQuizzes = userData.attemptedQuizzes || [];

					const classQuizzes = attemptedQuizzes.filter(q => q.classId === classId);

					let totalAchievedScore = 0;
					let totalMaxPossibleScore = 0;

					// Fetch all exercise details to get total points
					const detailedQuizzes = await Promise.all(classQuizzes.map(async (attempt) => {
						const classDocRef = doc(db, 'classes', attempt.classId);
						const classDocSnap = await getDoc(classDocRef);

						if (classDocSnap.exists()) {
							const classData = classDocSnap.data();
							const chapter = classData.chapters?.find(ch => ch.id === attempt.chapterId);
							const topic = chapter?.topics?.find(t => t.id === attempt.topicId);
							const exercise = topic?.exercises?.find(ex => ex.id === attempt.exerciseId);

							if (exercise) {
								const maxPoints = exercise.questions.reduce((sum, q) => sum + q.points, 0);
								return { ...attempt, maxPoints };
							}
						}
						return { ...attempt, maxPoints: 0 }; // Default if exercise not found
					}));

					detailedQuizzes.forEach(quiz => {
						totalAchievedScore += quiz.score;
						totalMaxPossibleScore += quiz.maxPoints;
					});

					const data = [];
					if (totalMaxPossibleScore > 0) {
						data.push({ name: 'Achieved Score', value: totalAchievedScore });
						data.push({ name: 'Remaining Possible Score', value: totalMaxPossibleScore - totalAchievedScore });
					} else {
						// If no quizzes or max points are 0, display a single segment for no data
						data.push({ name: 'No Data', value: 1 });
					}
					
					setPerformanceData(data);

				} else {
					console.log("Student user data not found.");
				}
			} catch (err) {
				console.error("Error fetching student performance data:", err);
				setError("Failed to load performance data.");
			} finally {
				setLoading(false);
			}
		};

		fetchPerformanceData();
	}, [classId, currentUser]);

	const COLORS = ['#0088FE', '#FFBB28']; // Blue for achieved, Yellow for remaining

	if (loading) {
		return <StudentDataLoader />;
	}

	if (error) {
		return <div className="student-main-content error">Error: {error}</div>;
	}

	const totalMaxScore = performanceData.reduce((sum, entry) => sum + entry.value, 0);

	return (
		<div className="student-main-content fade-in">
			<h3 className="section-title">Your Overall Performance</h3>
			{totalMaxScore === 0 ? (
				<p className="content-placeholder">No quiz attempts recorded yet for this class to display performance.</p>
			) : (
				<div className="performance-chart-card card-item">
					<h4>Performance Overview</h4>
					<ResponsiveContainer width="100%" height={300}>
						<PieChart>
							<Pie
								data={performanceData}
								cx="50%"
								cy="50%"
								labelLine={false}
								outterRadius={80}
								fill="#8884d8"
								dataKey="value"
								label={({ name, value, percent }) => 
									name === 'No Data' ? 'No Data' : `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
								}
							>
								{performanceData.map((entry, index) => (
									<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
								))}
							</Pie>
							<Tooltip formatter={(value, name) => [`${value} points`, name]} />
						</PieChart>
					</ResponsiveContainer>
				</div>
			)}
		</div>
	);
}

export default function StudentClassView() {
	const { classId } = useParams()
	const location = useLocation()
	const [classDetails, setClassDetails] = useState(null)
	const [loading, setLoading] = useState(true)
	const [expandedChapters, setExpandedChapters] = useState({}) // State to manage chapter expansion
	const [expandedTopics, setExpandedTopics] = useState({}) // State to manage topic expansion
	const currentUser = auth.currentUser; // Get current user

	const totalTopicsCount = classDetails?.chapters?.reduce((acc, chapter) => acc + (chapter.topics?.length || 0), 0) || 0

	useEffect(() => {
		if (!classId || !currentUser) return;

		const classRef = doc(db, 'classes', classId);
		const userRef = doc(db, 'users', currentUser.uid);

		const unsub = onSnapshot(classRef, async (docSnap) => {
			if (docSnap.exists()) {
				const classData = docSnap.data();
				setClassDetails(classData);


			} else {
				console.log("No such document for class!");
				setClassDetails(null);
			}
			setLoading(false);
		}, (error) => {
			console.error("Error fetching class details: ", error);
			setClassDetails(null);
			setLoading(false);
		});

		return () => unsub();
	}, [classId, currentUser]);

	const toggleChapterExpansion = (chapterId) => {
		setExpandedChapters(prev => ({
			...prev,
			[chapterId]: !prev[chapterId]
		}))
	}

	const toggleTopicExpansion = (topicId) => {
		setExpandedTopics(prev => ({
			...prev,
			[topicId]: !prev[topicId]
		}))
	}

	if (loading) {
		return <StudentDataLoader />
	}

	if (!classDetails) {
		return <div className="student-main-content">Class not found.</div>
	}

	console.log("StudentClassView render:", { classId, location: location.pathname, classDetails });

	return (
		<div className="student-class-view-container fade-in">
			<div className="class-sidebar student-sidebar-class">
				<h3 className="sidebar-class-title">{classDetails.name}</h3>
				<nav className="class-navigation">
					<Link to={`/student/class/${classId}/news-feed`} className={location.pathname.includes('/news-feed') ? 'active' : ''}><FaBell /> News Feed</Link>
					<Link to={`/student/class/${classId}/content`} className={location.pathname.includes('/content') ? 'active' : ''}><FaBookOpen /> Content ({totalTopicsCount})</Link>
						{location.pathname.includes('/content') && classDetails.chapters && classDetails.chapters.length > 0 && (
							<div className="content-nested-menu">
								{classDetails.chapters.map(chapter => (
									<div key={chapter.id} className="chapter-item-with-controls">
										<span onClick={() => toggleChapterExpansion(chapter.id)} className="chapter-title-toggle">
											<FaFolderOpen className="chapter-icon" /> {chapter.name}
										</span>
										<div className="controls">
											{expandedChapters[chapter.id] ? (
												<FaChevronUp onClick={() => toggleChapterExpansion(chapter.id)} className="icon-btn" title="Collapse Chapter" />
											) : (
												<FaChevronDown onClick={() => toggleChapterExpansion(chapter.id)} className="icon-btn" title="Expand Chapter" />
											)}
										</div>
									</div>
								))}
								{/* Nested Topics under expanded chapters */}
								{classDetails.chapters.map(chapter => (
									expandedChapters[chapter.id] && (
										<ul key={`topics-${chapter.id}`} className="topic-list-nested">
											{chapter.topics && chapter.topics.length > 0 ? (
												chapter.topics.map(topic => (
													<li key={topic.id} className="topic-item-nested">
														<Link to={`/student/class/${classId}/content/chapter/${chapter.id}/topic/${topic.id}`} className={location.pathname.includes(`/topic/${topic.id}`) ? 'active' : ''}>
															{topic.name}
														</Link>
													</li>
												))
											) : (
												<li className="topic-item-nested content-placeholder">No topics yet.</li>
											)}
										</ul>
									)
								))}
							</div>
						)}
					<Link to={`/student/class/${classId}/leaderboard`} className={location.pathname.includes('/leaderboard') ? 'active' : ''}><FaChartBar /> Leaderboard</Link>
					<Link to={`/student/class/${classId}/performance`} className={location.pathname.includes('/performance') ? 'active' : ''}><FaChartBar /> Performance</Link>
					<Link to={`/student/class/${classId}/submissions`} className={location.pathname.includes('/submissions') ? 'active' : ''}><FaTasks /> Submissions</Link>
				</nav>
			</div>
			<div className="class-main-content">
				<Outlet />
			</div>
		</div>
	)
}

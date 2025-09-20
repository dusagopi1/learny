import { useParams, Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { doc, onSnapshot, updateDoc, getDoc, arrayRemove, arrayUnion, collection, query, getDocs, addDoc, deleteDoc, orderBy, serverTimestamp } from 'firebase/firestore'
import { db, auth } from '../../firebase-config' // Import auth to get current user ID
import { FaBullhorn, FaBookOpen, FaFolderOpen, FaPlus, FaChevronDown, FaChevronUp, FaFileAlt, FaTrash, FaPaperPlane } from 'react-icons/fa'

export default function ClassDetails() {
	const { classId } = useParams()
	const navigate = useNavigate()
	const [classDetails, setClassDetails] = useState(null)
	const [loading, setLoading] = useState(true)
	const location = useLocation()

	// State for news feed
	const [newMessage, setNewMessage] = useState('');
	const [newsFeedPosts, setNewsFeedPosts] = useState([]);

	// State for content visibility
	const [isChapterExpanded, setIsChapterExpanded] = useState(true) // Was isContentExpanded
	const [expandedChapters, setExpandedChapters] = useState({}) // Was expandedSubjects
	const [expandedTopics, setExpandedTopics] = useState({}) // Was expandedChapters
	const [invitationLink, setInvitationLink] = useState(''); // New state for invitation link

	// State for add forms
	const [showAddChapterForm, setShowAddChapterForm] = useState(false) // Was showAddSubjectForm
	const [newChapterName, setNewChapterName] = useState('') // Was newSubjectName
	const [showAddTopicForm, setShowAddTopicForm] = useState(null) // Stores chapterId to show form // Was showAddChapterForm
	const [newTopicName, setNewTopicName] = useState('') // Was newChapterName


	useEffect(() => {
		if (!classId) return

		const unsubClass = onSnapshot(doc(db, 'classes', classId), (docSnap) => {
			if (docSnap.exists()) {
				const data = docSnap.data()
				setClassDetails({ id: docSnap.id, ...data })
				// Initialize expanded states if not already set
				if (data.chapters) { // Was data.subjects
					const initialChapterExpansion = {} // Was initialSubjectExpansion
					const initialTopicExpansion = {} // Was initialChapterExpansion
					data.chapters.forEach(chapter => { // Was data.subjects.forEach(subject
						if (chapter.id && expandedChapters[chapter.id] === undefined) { // Was subject.id && expandedSubjects[subject.id]
							initialChapterExpansion[chapter.id] = true // Was initialSubjectExpansion[subject.id]
						}
						if (chapter.topics) { // Was subject.chapters
							chapter.topics.forEach(topic => { // Was subject.chapters.forEach(chapter
								if (topic.id && expandedTopics[topic.id] === undefined) { // Was chapter.id && expandedChapters[chapter.id]
									initialTopicExpansion[topic.id] = true // Was initialChapterExpansion[chapter.id]
								}
							})
						}
					})
					setExpandedChapters(prev => ({ ...prev, ...initialChapterExpansion })) // Was setExpandedSubjects
					setExpandedTopics(prev => ({ ...prev, ...initialTopicExpansion })) // Was setExpandedChapters
				}

			} else {
				console.log("No such document!")
				setClassDetails(null)
			}
			setLoading(false)
		}, (error) => {
			console.error("Error fetching class details: ", error)
			setLoading(false)
		})

		// Setup real-time listener for news feed posts
		const postsRef = collection(db, 'classes', classId, 'newsFeed');
		const qPosts = query(postsRef, orderBy('timestamp', 'desc')); // Order by timestamp newest first

		const unsubPosts = onSnapshot(qPosts, (snapshot) => {
			const posts = snapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data()
			}));
			setNewsFeedPosts(posts);
		});

		return () => { unsubClass(); unsubPosts(); };
	}, [classId])

	const handleAddChapter = async (e) => { // Was handleAddSubject
		e.preventDefault()
		if (!newChapterName.trim()) return // Was newSubjectName

		const user = auth.currentUser;
		if (!user) {
			console.error("User not authenticated.");
			return;
		}

		try {
			const newChapter = { // Was newSubject
				id: Date.now().toString(),
				name: newChapterName, // Was newSubjectName
				topics: [], // Was chapters
			}
			const classRef = doc(db, 'classes', classId)
			const classSnap = await getDoc(classRef)
			const currentChapters = classSnap.data().chapters || [] // Was currentSubjects
			const updatedChapters = [...currentChapters, newChapter] // Was updatedSubjects

			await updateDoc(classRef, { chapters: updatedChapters }) // Was subjects: updatedSubjects

			// Log the notification payload before adding to Firestore
			console.log('Notification Payload (Chapter Created):', {
				recipientId: 'ALL_STUDENTS',
				senderId: user.uid,
				type: 'chapter_created',
				message: `Teacher ${user.displayName || 'Anonymous Teacher'} added a new chapter: "${newChapterName}" to ${classDetails.name}.`,
				link: `/student/class/${classId}/content`,
				read: false,
				createdAt: serverTimestamp(),
				classId: classId,
			});

			// Create notification for students in this class
			await addDoc(collection(db, 'notifications'), {
				recipientId: 'ALL_STUDENTS',
				senderId: user.uid,
				type: 'chapter_created',
				message: `Teacher ${user.displayName || 'Anonymous Teacher'} added a new chapter: "${newChapterName}" to ${classDetails.name}.`,
				link: `/student/class/${classId}/content`,
				read: false,
				createdAt: serverTimestamp(),
				classId: classId,
			});

			setNewChapterName('') // Was setNewSubjectName
			setShowAddChapterForm(false) // Was setShowAddSubjectForm
			setIsChapterExpanded(true) // Expand content to show new chapter // Was setIsContentExpanded
			setExpandedChapters(prev => ({ ...prev, [newChapter.id]: true })) // Expand the new chapter // Was setExpandedSubjects
		} catch (error) {
			console.error("Error adding chapter:", error) // Was Error adding subject
		}
	}

	const handleAddTopic = async (e, chapterId) => { // Was handleAddChapter(e, subjectId)
		e.preventDefault()
		if (!newTopicName.trim() || !chapterId) return // Was newChapterName.trim() || !subjectId

		const user = auth.currentUser;
		if (!user) {
			console.error("User not authenticated.");
			return;
		}

		try {
			const classRef = doc(db, 'classes', classId)
			const classSnap = await getDoc(classRef)
			if (!classSnap.exists()) throw new Error("Class not found.")

			const newTopic = { // Was newChapter
				id: Date.now().toString(),
				name: newTopicName, // Was newChapterName
			}

			const currentChapters = classSnap.data().chapters || [] // Was currentSubjects
			const chapterToUpdate = currentChapters.find(chapter => chapter.id === chapterId);
			const chapterName = chapterToUpdate ? chapterToUpdate.name : 'Unknown Chapter';

			const updatedChapters = currentChapters.map(chapter => { // Was updatedSubjects = currentSubjects.map(subject
				if (chapter.id === chapterId) { // Was subject.id === subjectId
					return {
						...chapter,
						topics: [...(chapter.topics || []), newTopic], // Was chapters: [...(subject.chapters || []), newChapter]
					}
				}
				return chapter
			})

			await updateDoc(classRef, { chapters: updatedChapters }) // Was subjects: updatedSubjects

			// Log the notification payload before adding to Firestore
			console.log('Notification Payload (Topic Created):', {
				recipientId: 'ALL_STUDENTS',
				senderId: user.uid,
				type: 'topic_created',
				message: `Teacher ${user.displayName || 'Anonymous Teacher'} added a new topic: "${newTopicName}" to chapter "${chapterName}" in ${classDetails.name}.`,
				link: `/student/class/${classId}/content/chapter/${chapterId}/topic/${newTopic.id}`,
				read: false,
				createdAt: serverTimestamp(),
				classId: classId,
			});

			// Create notification for students in this class
			await addDoc(collection(db, 'notifications'), {
				recipientId: 'ALL_STUDENTS',
				senderId: user.uid,
				type: 'topic_created',
				message: `Teacher ${user.displayName || 'Anonymous Teacher'} added a new topic: "${newTopicName}" to chapter "${chapterName}" in ${classDetails.name}.`,
				link: `/student/class/${classId}/content/chapter/${chapterId}/topic/${newTopic.id}`,
				read: false,
				createdAt: serverTimestamp(),
				classId: classId,
			});

			setNewTopicName('') // Was setNewChapterName
			setShowAddTopicForm(null) // Was setShowAddChapterForm
			setExpandedChapters(prev => ({ ...prev, [chapterId]: true })) // Ensure chapter is expanded // Was setExpandedSubjects
			setExpandedTopics(prev => ({ ...prev, [newTopic.id]: true })) // Expand the new topic // Was setExpandedChapters
		} catch (error) {
			console.error("Error adding topic:", error) // Was Error adding chapter
		}
	}

	// Remove handleAddTopic completely

	const handleDeleteChapter = async (chapterId) => { // Was handleDeleteSubject
		if (!confirm('Are you sure you want to delete this chapter and all its topics?')) return // Was subject and all its chapters/topics

		try {
			const classRef = doc(db, 'classes', classId)
			const classSnap = await getDoc(classRef)
			if (!classSnap.exists()) throw new Error("Class not found.")

			const currentChapters = classSnap.data().chapters || [] // Was currentSubjects
			const updatedChapters = currentChapters.filter(chapter => chapter.id !== chapterId) // Was subject => subject.id !== subjectId

			await updateDoc(classRef, { chapters: updatedChapters }) // Was subjects: updatedSubjects
			setExpandedChapters(prev => { // Was setExpandedSubjects
				const newState = { ...prev }
				delete newState[chapterId] // Was subjectId
				return newState
			})
		} catch (error) {
			console.error("Error deleting chapter:", error) // Was Error deleting subject
		}
	}

	const handleDeleteTopic = async (chapterId, topicId) => { // Was handleDeleteChapter(subjectId, chapterId)
		if (!confirm('Are you sure you want to delete this topic?')) return // Was chapter and all its topics

		try {
			const classRef = doc(db, 'classes', classId)
			const classSnap = await getDoc(classRef)
			if (!classSnap.exists()) throw new Error("Class not found.")

			const currentChapters = classSnap.data().chapters || [] // Was currentSubjects
			const updatedChapters = currentChapters.map(chapter => { // Was updatedSubjects = currentSubjects.map(subject
				if (chapter.id === chapterId) { // Was subject.id === subjectId
					const updatedTopics = (chapter.topics || []).filter(topic => topic.id !== topicId) // Was updatedChapters = (subject.chapters || []).filter(chapter => chapter.id !== chapterId)
					return { ...chapter, topics: updatedTopics } // Was { ...subject, chapters: updatedChapters }
				}
				return chapter
			})
			await updateDoc(classRef, { chapters: updatedChapters }) // Was subjects: updatedSubjects
			setExpandedTopics(prev => { // Was setExpandedChapters
				const newState = { ...prev }
				delete newState[topicId] // Was chapterId
				return newState
			})
		} catch (error) {
			console.error("Error deleting topic:", error) // Was Error deleting chapter
		}
	}

	// Remove handleDeleteTopic(subjectId, chapterId, topicId) completely

	const toggleChapterExpansion = (chapterId) => { // Was toggleSubjectExpansion
		setExpandedChapters((prev) => ({ // Was setExpandedSubjects
			...prev,
			[chapterId]: !prev[chapterId], // Was subjectId
		}))
	}

	const toggleTopicExpansion = (topicId) => { // Was toggleChapterExpansion
		setExpandedTopics((prev) => ({ // Was setExpandedChapters
			...prev,
			[topicId]: !prev[topicId], // Was chapterId
		}))
	}

	const toggleContentExpansion = () => { // Overall content expansion (remains the same purpose but refers to chapters now)
		setIsChapterExpanded((prev) => !prev) // Was setIsContentExpanded
	}

	const handleGenerateInvitationLink = () => {
		if (classId) {
			// For simplicity, using classId as invitationCode. In a real app, generate a unique token.
			const generatedLink = `${window.location.origin}/join-class/${classId}/${classId}`;
			setInvitationLink(generatedLink);
			// Optionally, save this invitationLink to Firebase for the class if you need to track it
			// or regenerate unique codes for different student groups.
			console.log("Generated Invitation Link:", generatedLink);
			// You might want to copy it to clipboard here as well
			navigator.clipboard.writeText(generatedLink).then(() => {
				alert("Invitation link copied to clipboard!");
			}).catch(err => {
				console.error("Failed to copy link:", err);
			});
		}
	};

	const handlePostMessage = async (e) => {
		e.preventDefault();
		if (!newMessage.trim()) return;

		const user = auth.currentUser;
		if (!user) {
			console.error("User not authenticated.");
			return;
		}

		try {
			const newsFeedRef = collection(db, 'classes', classId, 'newsFeed');
			await addDoc(newsFeedRef, {
				teacherId: user.uid,
				teacherName: user.displayName || 'Anonymous Teacher',
				timestamp: serverTimestamp(), // Use serverTimestamp for consistency
				message: newMessage,
			});

			// Log the notification payload before adding to Firestore
			console.log('Notification Payload (Announcement):', {
				recipientId: 'ALL_STUDENTS', // All students in this class
				senderId: user.uid,
				type: 'announcement',
				message: `Teacher ${user.displayName || 'Anonymous Teacher'} posted an announcement in ${classDetails.name}: "${newMessage.substring(0, 50)}..."`,
				link: `/student/class/${classId}/news-feed`,
				read: false,
				createdAt: serverTimestamp(),
				classId: classId,
			});

			// Create notification for students in this class
			await addDoc(collection(db, 'notifications'), {
				recipientId: 'ALL_STUDENTS', // All students in this class
				senderId: user.uid,
				type: 'announcement',
				message: `Teacher ${user.displayName || 'Anonymous Teacher'} posted an announcement in ${classDetails.name}: "${newMessage.substring(0, 50)}..."`,
				link: `/student/class/${classId}/news-feed`,
				read: false,
				createdAt: serverTimestamp(),
				classId: classId,
			});

			setNewMessage('');
		} catch (error) {
			console.error("Error posting message:", error);
		}
	};

	const handleDeletePost = async (postId) => {
		if (!confirm('Are you sure you want to delete this post?')) return;

		try {
			const postRef = doc(db, 'classes', classId, 'newsFeed', postId);
			await deleteDoc(postRef);
		} catch (error) {
			console.error("Error deleting post:", error);
		}
	};


	if (loading) {
		return <div className="page fade-in">Loading class details...</div>
	}

	if (!classDetails) {
		return <div className="page fade-in">Class not found.</div>
	}

	const chapters = classDetails.chapters || [] // Was subjects
	const displayName = auth.currentUser ? auth.currentUser.displayName : 'Anonymous';

	return (
		<div className="class-details-layout fade-in">
			<aside className="class-sidebar">
				<h3>{classDetails.name}</h3>
				<nav>
					<Link key="news-feed-link" to={`/teacher/class/${classId}/news-feed`} className={location.pathname.includes('/news-feed') ? 'active' : ''}><FaBullhorn />News Feed</Link>
					<div key="content-controls" className="sidebar-item-with-controls">
						<Link to={`/teacher/class/${classId}/content`} className={location.pathname.includes('/content') ? 'active' : ''}>
							<FaBookOpen />Content ({chapters.length}) {/* Was subjects.length */}
						</Link>
						<div className="controls">
							<FaPlus onClick={() => setShowAddChapterForm(true)} className="icon-btn" title="Add Chapter" /> {/* Was setShowAddSubjectForm */}
							{isChapterExpanded ? ( // Was isContentExpanded
								<FaChevronUp onClick={toggleContentExpansion} className="icon-btn" title="Collapse Content" />
							) : (
								<FaChevronDown onClick={toggleContentExpansion} className="icon-btn" title="Expand Content" />
							)}
						</div>
					</div>

					{showAddChapterForm && ( // Was showAddSubjectForm
						<form key={`add-chapter-form-${classId}`} onSubmit={handleAddChapter} className="add-content-form fade-in"> {/* Was add-subject-form, handleAddSubject */}
							<input
								type="text"
								value={newChapterName} // Was newSubjectName
								onChange={(e) => setNewChapterName(e.target.value)} // Was setNewSubjectName
								placeholder="New Chapter Name" // Was New Subject Name
								required
							/>
							<button type="submit">Add</button>
							<button type="button" onClick={() => setShowAddChapterForm(false)} className="cancel-btn">Cancel</button> {/* Was setShowAddSubjectForm */}
						</form>
					)}

					{isChapterExpanded && chapters.map((chapter) => ( // Was isContentExpanded && subjects.map((subject)
						<div key={chapter.id} className="content-nested-menu fade-in"> {/* Was subject.id */}
							<div className="sidebar-item-with-controls">
								<span className="subject-name"><FaFolderOpen /> {chapter.name}</span> {/* Was subject.name */}
								<div className="controls">
									<FaPlus onClick={() => setShowAddTopicForm(chapter.id)} className="icon-btn" title="Add Topic" />
									{expandedChapters[chapter.id] ? (
										<FaChevronUp onClick={() => toggleChapterExpansion(chapter.id)} className="icon-btn" title="Collapse Topics" />
									) : (
										<FaChevronDown onClick={() => toggleChapterExpansion(chapter.id)} className="icon-btn" title="Expand Topics" />
									)}
									<FaTrash onClick={() => handleDeleteChapter(chapter.id)} className="icon-btn delete-icon" title="Delete Chapter" />
								</div>
							</div>

							{showAddTopicForm === chapter.id && (
								<form key={`add-topic-form-${chapter.id}`} onSubmit={(e) => handleAddTopic(e, chapter.id)} className="add-content-form fade-in">
									<input
										type="text"
										value={newTopicName}
										onChange={(e) => setNewTopicName(e.target.value)}
										placeholder="New Topic Name"
										required
									/>
									<button type="submit">Add</button>
									<button type="button" onClick={() => setShowAddTopicForm(null)} className="cancel-btn">Cancel</button>
								</form>
							)}

							{expandedChapters[chapter.id] && chapter.topics && chapter.topics.length > 0 && (
								<ul className="chapter-list fade-in">
									{chapter.topics.map((topic) => (
										<li key={topic.id} className="chapter-item">
											<div className="sidebar-item-with-controls">
												<Link to={`/teacher/class/${classId}/content/chapter/${chapter.id}/topic/${topic.id}`}>
													<span>{topic.name}</span>
												</Link>
												<div className="controls">
													{/* Removed FaPlus for topic content as per requirement */}
													{expandedTopics[topic.id] ? (
														<FaChevronUp onClick={() => toggleTopicExpansion(topic.id)} className="icon-btn" title="Collapse Topic" />
													) : (
														<FaChevronDown onClick={() => toggleTopicExpansion(topic.id)} className="icon-btn" title="Expand Topic" />
													)}
													<FaTrash onClick={() => handleDeleteTopic(chapter.id, topic.id)} className="icon-btn delete-icon" title="Delete Topic" />
												</div>
											</div>

											{/* Removed the form for adding sub-topics as per new hierarchy */}

											{/* Removed nested topic list, as the current 'topic' is the lowest level */}
										</li>
									))}
								</ul>
							)}
						</div>
					))}

					<Link key="submissions-link" to={`/teacher/class/${classId}/submissions`} className={location.pathname.includes('/submissions') ? 'active' : ''}><FaFolderOpen />Leaderboard</Link>
					<Link key="performance-link" to={`/teacher/class/${classId}/performance`} className={location.pathname.includes('/performance') ? 'active' : ''}><FaFileAlt />Performance</Link>
				</nav>

				{/* New section for invitation link */}
				<div className="invitation-link-section">
					<h4>Invite Students</h4>
					<button onClick={handleGenerateInvitationLink} className="generate-link-btn">
						Generate Invitation Link
					</button>
					{invitationLink && (
						<p className="generated-link">Link: <a href={invitationLink} target="_blank" rel="noopener noreferrer">{invitationLink}</a></p>
					)}
				</div>

			</aside>
			<main className="class-main-content">
				{location.pathname === `/teacher/class/${classId}/news-feed` && (
					<div className="news-feed-section page fade-in">
						<h3>Class News Feed</h3>
						<form onSubmit={handlePostMessage} className="news-feed-form">
							<textarea
								value={newMessage}
								onChange={(e) => setNewMessage(e.target.value)}
								placeholder="Write an announcement or message..."
								rows="4"
								required
							></textarea>
							<button type="submit"><FaPaperPlane /> Post</button>
						</form>
						<div className="news-feed-posts">
							{newsFeedPosts.length === 0 ? (
								<p className="content-placeholder">No announcements yet. Be the first to post!</p>
							) : (
								newsFeedPosts.map(post => (
									<div key={post.id} className="news-feed-post">
										<p className="post-message">{post.message}</p>
										<div className="post-meta">
											<span>Posted by {post.teacherName} on {new Date(post.timestamp.seconds * 1000).toLocaleString()}</span>
											{auth.currentUser && auth.currentUser.uid === post.teacherId && (
												<button onClick={() => handleDeletePost(post.id)} className="icon-btn delete-icon" title="Delete Post"><FaTrash /></button>
											)}
										</div>
									</div>
								))
							)}
						</div>
					</div>
				)} 
				<Outlet />
			</main>
		</div>
	)
}

export function ClassNewsFeed() {
	const { classId } = useParams()
	return <div className="page fade-in"><h3>News Feed for Class: {classId}</h3><p>Latest announcements and updates.</p></div>
}

export function ClassContent() {
	const { classId } = useParams()
	return <div className="page fade-in"><h3>Content for Class: {classId}</h3><p>Here you will see all chapters and topics.</p></div>
}

export function ClassLeaderboard() {
	const { classId } = useParams();
	const [enrolledStudents, setEnrolledStudents] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		if (!classId) return;

		const fetchSubmissionData = async () => {
			try {
				setLoading(true);

				// Fetch all students
				const usersRef = collection(db, 'users');
				// Query for students who have this classId in their enrolledClasses (if you implemented this for students)
				// For now, let's fetch all students and filter by role, then by attempted quizzes for this class
				const q = query(usersRef);
				const querySnapshot = await getDocs(q);

				const students = [];
				querySnapshot.forEach(doc => {
					const userData = doc.data();
					if (userData.role === 'student') {
						// Check if the student is enrolled in this class
						const isEnrolled = userData.enrolledClasses && userData.enrolledClasses.includes(classId);
						if (isEnrolled) {
							students.push({
								id: doc.id,
								displayName: userData.displayName || 'Anonymous',
								totalPoints: userData.totalPoints || 0,
								attemptedQuizzes: userData.attemptedQuizzes || [],
								// You might want to filter attemptedQuizzes specific to this class/topic if multiple classes are tracked
							});
						}
					}
				});

				// Calculate total scores for each student and sort them
				const studentsWithScores = students.map(student => {
					const totalScore = student.attemptedQuizzes
						.filter(q => q.classId === classId)
						.reduce((sum, q) => sum + q.score, 0);
					return { ...student, totalScore };
				});

				// Sort students by totalScore in descending order
				studentsWithScores.sort((a, b) => b.totalScore - a.totalScore);

				setEnrolledStudents(studentsWithScores);
			} catch (err) {
				console.error("Error fetching submission data:", err);
				setError("Failed to load submission data.");
			} finally {
				setLoading(false);
			}
		};

		fetchSubmissionData();
	}, [classId]);

	// No need for getSubmissionStatus, submittedStudents, notSubmittedStudents, topScorer
	// as we will display a sorted leaderboard directly

	if (loading) {
		return <div className="page fade-in">Loading submissions...</div>;
	}

	if (error) {
		return <div className="page fade-in error">Error: {error}</div>;
	}

	return (
		<div className="page fade-in">
			<h3>Leaderboard for Class: {classId}</h3>
			
			<div className="leaderboard-container">
				{enrolledStudents.length === 0 ? (
					<p>No students have attempted quizzes for this class yet.</p>
				) : (
					<ol className="leaderboard-list">
						{enrolledStudents.map((student, index) => (
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

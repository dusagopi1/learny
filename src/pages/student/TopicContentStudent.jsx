import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase-config'
import { FaVideo, FaFileImage, FaFile, FaQuestionCircle, FaBook, FaPlayCircle, FaImages, FaRegFileAlt, FaLaptopCode } from 'react-icons/fa' // Import additional icons
import { Link } from 'react-router-dom'
import { marked } from 'marked'; // Import marked library for Markdown parsing

export default function StudentTopicContent() {
	const { classId, chapterId, topicId } = useParams()
	const [noteContent, setNoteContent] = useState('')
	const [topicVideos, setTopicVideos] = useState([])
	const [topicSlides, setTopicSlides] = useState([])
	const [topicDocs, setTopicDocs] = useState([])
	const [topicExercises, setTopicExercises] = useState([])
	const [currentTopicName, setCurrentTopicName] = useState('')
	const [activeTab, setActiveTab] = useState('note')
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!classId || !chapterId || !topicId) return

		setLoading(true);
		const classRef = doc(db, 'classes', classId)
		const unsub = onSnapshot(classRef, (docSnap) => {
			if (docSnap.exists()) {
				const classData = docSnap.data()
				const currentChapter = classData.chapters?.find(ch => ch.id === chapterId)
				const currentTopic = currentChapter?.topics?.find(t => t.id === topicId)

				console.log("Class Data:", classData);
				console.log("Current Chapter:", currentChapter);
				console.log("Current Topic:", currentTopic);

				// Parse markdown content
				setNoteContent(currentTopic?.noteContent ? marked.parse(currentTopic.noteContent) : '');
				setTopicVideos(currentTopic?.videos || [])
				setTopicSlides(currentTopic?.slides || [])
				setTopicDocs(currentTopic?.docs || [])
				setTopicExercises(currentTopic?.exercises || [])
				setCurrentTopicName(currentTopic?.name || 'Unknown Topic')
			} else {
				console.log("No such document for class!")
				setNoteContent('')
				setTopicVideos([])
				setTopicSlides([])
				setTopicDocs([])
				setTopicExercises([])
				setCurrentTopicName('Unknown Topic')
			}
			setLoading(false);
		}, (error) => {
			console.error("Error fetching student topic content: ", error)
			setNoteContent('')
			setTopicVideos([])
			setTopicSlides([])
			setTopicDocs([])
			setTopicExercises([])
			setCurrentTopicName('Unknown Topic')
			setLoading(false);
		})

		return () => unsub()
	}, [classId, chapterId, topicId])

	if (loading) {
		return <div className="student-main-content">Loading topic content...</div>;
	}

	return (
		<div className="student-topic-content-container fade-in">
			<div className="student-topic-header">
				<h2>{currentTopicName}</h2>
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
					<FaImages /> Slide <span className="count">{topicSlides.length}</span>
				</div>
				<div
					className={`student-tab-item ${activeTab === 'video' ? 'active' : ''}`}
					onClick={() => setActiveTab('video')}
				>
					<FaPlayCircle /> Video <span className="count">{topicVideos.length}</span>
				</div>
				<div
					className={`student-tab-item ${activeTab === 'docs' ? 'active' : ''}`}
					onClick={() => setActiveTab('docs')}
				>
					<FaRegFileAlt /> Docs <span className="count">{topicDocs.length}</span>
				</div>
				<div
					className={`student-tab-item ${activeTab === 'quiz' ? 'active' : ''}`}
					onClick={() => setActiveTab('quiz')}
				>
					<FaLaptopCode /> Quiz <span className="count">{topicExercises.length}</span>
				</div>
			</div>

			<div className="student-tab-content">
				{activeTab === 'note' && (
					<div className="note-content" dangerouslySetInnerHTML={{ __html: noteContent }}></div>
				)}
				{activeTab === 'slide' && (
					<div className="slide-content-grid fade-in">
						{topicSlides.length === 0 ? (
							<p className="content-placeholder">No slides available for this topic.</p>
						) : (
							topicSlides.map((slide, index) => (
								<div key={index} className="slide-item card-item">
									{/* Assuming slide.url is an image for now */}
									{slide.url && <img src={slide.url} alt={`Slide ${index + 1}`} className="slide-image" />}
									<p className="slide-title">{slide.name || `Slide ${index + 1}`}</p>
								</div>
							))
						)}
					</div>
				)}
				{activeTab === 'video' && (
					<div className="student-video-grid fade-in">
						{topicVideos.length === 0 ? (
							<p className="content-placeholder">No videos available for this topic.</p>
						) : (
							topicVideos.map((video, index) => {
								const getYoutubeVideoId = (url) => {
									if (!url || typeof url !== 'string') return null;
									const regExp = /^(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
									const match = url.match(regExp);
									return (match && match[1].length === 11) ? match[1] : null;
								};

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
								)
							})
						)}
					</div>
				)}
				{activeTab === 'docs' && (
					<div className="doc-content-grid fade-in">
						{topicDocs.length === 0 ? (
							<p className="content-placeholder">No documents available for this topic.</p>
						) : (
							topicDocs.map((docItem, index) => (
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
						{topicExercises.length === 0 ? (
							<p className="content-placeholder">No quizzes or exercises created yet for this topic.</p>
						) : (
							<div className="exercises-grid">
								{topicExercises.map(exercise => (
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
	)
}

import { useParams } from 'react-router-dom'
import { Editor } from '@tinymce/tinymce-react'
import { useState, useEffect, useRef } from 'react'
import { FaFileAlt, FaFileImage, FaVideo, FaFile, FaQuestionCircle, FaTimes } from 'react-icons/fa' // Import FaQuestionCircle and FaTimes
import VideoModal from '../../components/VideoModal' // Import VideoModal
import AiConfirmModal from '../../components/AiConfirmModal' // Import AiConfirmModal
import { db } from '../../firebase-config'
import { doc, onSnapshot, updateDoc, arrayUnion, getDoc } from 'firebase/firestore'
import { generateContentWithGemini } from '../../utils/geminiApi' // Import the simulated Gemini API util
import { marked } from 'marked' // Import marked library
import { Link } from 'react-router-dom'; // Import Link
import { useToast } from '../../components/Toast'; // Import useToast hook

export default function TopicContent() {
	const { classId, chapterId, topicId } = useParams()
	const [activeTab, setActiveTab] = useState('note')
	const [noteContent, setNoteContent] = useState('')
	const [showVideoModal, setShowVideoModal] = useState(false)
	const [showAiConfirmModal, setShowAiConfirmModal] = useState(false)
	const [topicVideos, setTopicVideos] = useState([])
	const [topicSlides, setTopicSlides] = useState([])
	const [topicDocs, setTopicDocs] = useState([])
	const [topicExercises, setTopicExercises] = useState([]) // New state for topic exercises
	const [isSaving, setIsSaving] = useState(false)
	const [currentTopicName, setCurrentTopicName] = useState('')
	const editorRef = useRef(null); // Ref to access TinyMCE editor instance
	const { showToast } = useToast(); // Use the toast hook
	const [isGeneratingNotes, setIsGeneratingNotes] = useState(false); // New state for AI generation loading

	useEffect(() => {
		if (!classId || !chapterId || !topicId) return

		const classRef = doc(db, 'classes', classId)

		const unsub = onSnapshot(classRef, (docSnap) => {
			if (docSnap.exists()) {
				const classData = docSnap.data()
				const currentChapter = classData.chapters?.find(ch => ch.id === chapterId)
				const currentTopic = currentChapter?.topics?.find(t => t.id === topicId)

				console.log("Current Topic Object:", currentTopic); // Add this line for debugging
				console.log("Current Topic Exercises:", currentTopic?.exercises); // Add this line for debugging

				setTopicVideos(currentTopic?.videos || [])
				setNoteContent(currentTopic?.noteContent || '')
				setTopicSlides(currentTopic?.slides || [])
				setTopicDocs(currentTopic?.docs || [])
				setTopicExercises(currentTopic?.exercises || []) // Set topic exercises
				setCurrentTopicName(currentTopic?.name || 'Unknown Topic') // Set topic name

				console.log("Fetched Topic Name:", currentTopic?.name); // Add this line for debugging

			} else {
				console.log("No such document for class!")
				setTopicVideos([])
				setNoteContent('')
				setTopicSlides([])
				setTopicDocs([])
				setTopicExercises([])
				setCurrentTopicName('Unknown Topic')
			}
		}, (error) => {
			console.error("Error fetching topic content: ", error)
			setTopicVideos([])
			setNoteContent('')
			setTopicSlides([])
			setTopicDocs([])
			setTopicExercises([])
			setCurrentTopicName('Unknown Topic')
		})

		return () => unsub()
	}, [classId, chapterId, topicId])

	const handleEditorChange = (content, editor) => {
		setNoteContent(content)
		// console.log('Content was updated:', content)
	}

	const handleAddVideo = async (videoData) => {
		console.log('Adding video:', videoData)
		try {
			const classRef = doc(db, 'classes', classId)
			const classSnap = await getDoc(classRef)

			if (!classSnap.exists()) {
				throw new Error("Class document not found.")
			}

			const classData = classSnap.data()
			const updatedChapters = classData.chapters.map(chapter => {
				if (chapter.id === chapterId) {
					const updatedTopics = chapter.topics.map(topic => {
						if (topic.id === topicId) {
							return {
								...topic,
								videos: [...(topic.videos || []), videoData] // Ensure we're adding to the correct topic
							}
						}
						return topic
					})
					return { ...chapter, topics: updatedTopics }
				}
				return chapter
			})

			await updateDoc(classRef, { chapters: updatedChapters })
			showToast('Video added successfully!', 'success'); // Use toast
			setShowVideoModal(false)
		} catch (error) {
			console.error("Error adding video:", error)
			showToast('Failed to add video. Please try again.', 'error'); // Use toast
		}
	}

	const handleDeleteVideo = async (videoUrl) => {
		console.log('Deleting video:', videoUrl)
		try {
			const classRef = doc(db, 'classes', classId)
			const classSnap = await getDoc(classRef)

			if (!classSnap.exists()) {
				throw new Error("Class document not found.")
			}

			const classData = classSnap.data()
			const updatedChapters = classData.chapters.map(chapter => {
				if (chapter.id === chapterId) {
					const updatedTopics = chapter.topics.map(topic => {
						if (topic.id === topicId) {
							return {
								...topic,
								videos: topic.videos.filter(video => video.url !== videoUrl)
							}
						}
						return topic
					})
					return { ...chapter, topics: updatedTopics }
				}
				return chapter
			})

			await updateDoc(classRef, { chapters: updatedChapters })
			showToast('Video deleted successfully!', 'success'); // Use toast
			setTopicVideos(topicVideos.filter(video => video.url !== videoUrl))
		} catch (error) {
			console.error("Error deleting video:", error)
			showToast('Failed to delete video. Please try again.', 'error'); // Use toast
		}
	}

	const handleGenerateAiContent = async (editorInstance) => {
		// This function will be called if user confirms AI generation
		setIsGeneratingNotes(true); // Set loading to true
		const existingContent = editorInstance.getContent();
		// Update the prompt to request approximately 100 lines
		const prompt = `Generate detailed notes on the topic "${currentTopicName}", approximately 100 lines long. Format: ${existingContent}`;

		try {
			const aiResponse = await generateContentWithGemini(prompt)
			// Convert markdown response to HTML before setting it in the editor
			const htmlResponse = marked(aiResponse);
			console.log("HTML Response from Marked:", htmlResponse); // Add this line for debugging
			editorInstance.execCommand('mceInsertContent', false, htmlResponse);
			showToast('Lesson note generated successfully!', 'success'); // Use toast
		} catch (error) {
			console.error("Error generating content with AI:", error)
			showToast('Failed to generate content with AI. Please try again.', 'error'); // Use toast
		} finally {
			setIsGeneratingNotes(false); // Set loading to false
		}
		setShowAiConfirmModal(false) // Close modal after generation attempt
	}

	const handleSubmitAllContent = async () => {
		setIsSaving(true)
		try {
			const classRef = doc(db, 'classes', classId)
			const classSnap = await getDoc(classRef)

			if (!classSnap.exists()) {
				throw new Error("Class document not found.")
			}

			const classData = classSnap.data()
			const updatedChapters = classData.chapters.map(chapter => {
				if (chapter.id === chapterId) {
					const updatedTopics = chapter.topics.map(topic => {
						if (topic.id === topicId) {
							return {
								...topic,
								noteContent: noteContent, // Save note content
								slides: topicSlides,     // Save slides (even if empty for now)
								docs: topicDocs,         // Save docs (even if empty for now)
								videos: topicVideos, // Ensure latest videos are saved
								exercises: topicExercises, // Save exercises
							}
						}
						return topic
					})
					return { ...chapter, topics: updatedTopics }
				}
				return chapter
			})

			await updateDoc(classRef, { chapters: updatedChapters })
			showToast('All topic content saved successfully!', 'success'); // Use toast
		} catch (error) {
			console.error("Error saving all topic content:", error)
			showToast('Failed to save all topic content. Please try again.', 'error'); // Use toast
		} finally {
			setIsSaving(false)
		}
	}


	return (
		<div className="topic-content-page fade-in">
			<h2>{currentTopicName}</h2>
			<div className="content-tabs">
				<div
					className={`tab-item ${activeTab === 'note' ? 'active' : ''}`}
					onClick={() => setActiveTab('note')}
				>
					<FaFileAlt /> Noe <span className="count">{noteContent ? 1 : 0}</span>
				</div>
				<div
					className={`tab-item ${activeTab === 'slide' ? 'active' : ''}`}
					onClick={() => setActiveTab('slide')}
				>
					<FaFileImage /> Slide <span className="count">{topicSlides.length}</span>
				</div>
				<div
					className={`tab-item ${activeTab === 'video' ? 'active' : ''}`}
					onClick={() => { setActiveTab('video'); setShowVideoModal(true) }}
				>
					<FaVideo /> Video <span className="count">{topicVideos.length}</span>
				</div>
				<div
					className={`tab-item ${activeTab === 'docs' ? 'active' : ''}`}
					onClick={() => setActiveTab('docs')}
				>
					<FaFile /> Docs <span className="count">{topicDocs.length}</span>
				</div>
				{/* New Quiz Tab */}
				<div
					className={`tab-item ${activeTab === 'quiz' ? 'active' : ''}`}
					onClick={() => setActiveTab('quiz')}
				>
					<FaQuestionCircle /> Quiz <span className="count">{topicExercises.length}</span>
				</div>
			</div>

			<div className="content-editor-container">
				<div className="editor-header">
					<div className="editor-toolbar-top">
						{/* TinyMCE will render its own toolbar here */}
					</div>
					<div className="ai-button-container">
						<button className="submit-all-content-btn" onClick={handleSubmitAllContent} disabled={isSaving}>
							{isSaving ? 'Saving...' : 'Save All Content'}
						</button>
						{/* Replace the generic AI button with the specific 'Generate Lesson Note' button */}
						<button className="ai-button" onClick={() => setShowAiConfirmModal(true)} disabled={isGeneratingNotes || isSaving}>
							{isGeneratingNotes ? 'Generating...' : 'Generate Lesson Note'}
						</button>
					</div>
				</div>
				{activeTab === 'note' && (
					<Editor
						onInit={(evt, editor) => editorRef.current = editor} // Assign editor instance to ref
						apiKey="6p6cbu4c699ktkthiihry73to6zxgvpa0vz5at3u35quep4q"
						init={{
							plugins: [
								'anchor', 'autolink', 'charmap', 'codesample', 'emoticons', 'link', 'lists', 'media', 'searchreplace', 'table', 'visualblocks', 'wordcount',
								'checklist', 'mediaembed', 'casechange', 'formatpainter', 'pageembed', 'a11ychecker', 'tinymcespellchecker', 'permanentpen', 'powerpaste', 'advtable', 'advcode', 'advtemplate', 'ai', 'uploadcare', 'mentions', 'tinycomments', 'tableofcontents', 'footnotes', 'mergetags', 'autocorrect', 'typography', 'inlinecss', 'markdown','importword', 'exportword', 'exportpdf'
							],
							toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | link media table mergetags | addcomment showcomments | spellcheckdialog a11ycheck typography uploadcare | align lineheight | checklist numlist bullist indent outdent | emoticons charmap | removeformat',
							menubar: 'file edit view insert format tools help',
							selector: 'textarea',
							height: 500,
							width: '100%',
							content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
							autoresize_bottom_margin: 0,
							tinycomments_mode: 'embedded',
							tinycomments_author: 'Author name',
							mergetags_list: [
								{ value: 'First.Name', title: 'First Name' },
								{ value: 'Email', title: 'Email' },
							],
							ai_request: (request, respondWith) => {
								// This callback is for the AI button INSIDE TinyMCE toolbar.
								// We want our custom button to handle the confirmation.
								// For now, if TinyMCE's own AI button is clicked, we can just close the modal
								// or prevent default behavior if needed, but for this context, it's not strictly necessary
								// as the user intends to use our custom 'Generate Lesson Note' button.
								respondWith.string(() => Promise.resolve('Please use the "Generate Lesson Note" button for AI assistance.'));
							},
							uploadcare_public_key: 'b3ab1cae3b5348e95174',
							setup: function (editor) {
								editor.on('init', function () {
									console.log('TinyMCE editor initialized');
								});
							}
						}}
						onEditorChange={handleEditorChange}
						value={noteContent} // Bind editor to noteContent state
					/>
				)}
				{/* Placeholder for other content types */}
				{activeTab === 'slide' && <div className="content-placeholder">Slide content will be displayed here.</div>}
				{activeTab === 'video' && (
					<div className="video-list-container fade-in">
						{topicVideos.length === 0 ? (
							<p className="content-placeholder">No videos added yet. Click the "Video" tab to add one!</p>
						) : (
							<div className="video-grid">
								{topicVideos.map((video, index) => {
									const getYoutubeVideoId = (url) => {
										if (!url || typeof url !== 'string') return null;
										const regExp = /^(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
										const match = url.match(regExp);
										return (match && match[1].length === 11) ? match[1] : null;
									};

									const youtubeVideoId = video.type === 'youtube' ? getYoutubeVideoId(video.url) : null;

									return (
										<div key={index} className="video-item">
											{video.type === 'youtube' && youtubeVideoId ? (
												<iframe
													width="320"
													height="180"
													src={`https://www.youtube.com/embed/${youtubeVideoId}`}
													frameBorder="0"
													allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
													allowFullScreen
													title="YouTube video player"
												>
												</iframe>
											) : video.type === 'upload' ? (
												<video width="320" height="180" controls>
													<source src={video.url} type="video/mp4" />
													Your browser does not support the video tag.
												</video>
											) : (
												<p>Invalid video URL or type for: {video.url}</p>
											)}
											<button
												className="delete-video-btn"
												onClick={() => handleDeleteVideo(video.url)}
												title="Delete Video"
											>
												<FaTimes />
											</button>
										</div>
									)
								})}
							</div>
						)}
					</div>
				)}
				{activeTab === 'docs' && <div className="content-placeholder">Document content will be displayed here.</div>}
				{activeTab === 'quiz' && (
					<div className="quiz-content-container fade-in">
						<Link 
							className="add-exercise-btn" 
							to={`/teacher/class/${classId}/content/chapter/${chapterId}/topic/${topicId}/new-exercise`}
						>
							Add New Exercise
						</Link>
						{topicExercises.length === 0 ? (
							<p className="content-placeholder">No quizzes or exercises created yet for this topic.</p>
						) : (
							<div className="exercises-grid">
								{topicExercises.map(exercise => (
									<Link 
										key={exercise.id} 
										to={`/teacher/class/${classId}/content/chapter/${chapterId}/topic/${topicId}/exercise/${exercise.id}`}
										className="exercise-card"
									>
										<h3>{exercise.title}</h3>
										<p>{new Date(exercise.createdAt).toLocaleDateString()}</p>
									</Link>
								))}
							</div>
						)}
					</div>
				)}
			</div>
			{showVideoModal && <VideoModal onClose={() => setShowVideoModal(false)} onAddVideo={handleAddVideo} videosAddedCount={topicVideos.length} />}
			{showAiConfirmModal && (
				<AiConfirmModal
					topicName={currentTopicName}
					onConfirm={() => handleGenerateAiContent(editorRef.current)} // Pass editor instance to handler
					onCancel={() => setShowAiConfirmModal(false)}
					isLoading={isGeneratingNotes} // Pass the new loading state
				/>
			)}
			{/* NewExerciseModal component is no longer rendered here as showNewExerciseModal is removed */}
		</div>
	)
}

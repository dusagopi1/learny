import { useState } from 'react'
import { auth, db } from '../../firebase-config'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { useToast } from '../../components/Toast' // Import useToast hook

export default function TeacherCreateClass() {
	const [step, setStep] = useState(1)
	const [className, setClassName] = useState('')
	const [classDescription, setClassDescription] = useState('')
	const [chapterName, setChapterName] = useState('') // Now directly under class
	const [topicName, setTopicName] = useState('') // Now directly under chapter
	const [loading, setLoading] = useState(false)
	const [message, setMessage] = useState('') // This can be removed after implementing toast
	const { showToast } = useToast(); // Use the toast hook

	const nextStep = () => setStep((prev) => prev + 1)
	const prevStep = () => setStep((prev) => prev - 1)

	async function handleCreate(e) {
		e.preventDefault()
		setMessage('') // Remove or comment this line
		setLoading(true)
		try {
			const user = auth.currentUser
			if (!user) throw new Error('Not authenticated')

			const newClassData = {
				name: className,
				description: classDescription,
				ownerUid: user.uid,
				createdAt: serverTimestamp(),
				chapters: [{
					id: Date.now().toString(), // Add ID for the top-level chapter
					name: chapterName,
					topics: [{
						id: Date.now().toString(), // Add ID for the topic
						name: topicName
					}]
				}]
			}

			await addDoc(collection(db, 'classes'), newClassData)

			setClassName('')
			setClassDescription('')
			setChapterName('') // Reset chapter name
			setTopicName('') // Reset topic name
			setStep(1)
			showToast('Class, chapter, and topic created successfully!', 'success'); // Use toast
		} catch (err) {
			showToast(err.message || 'Failed to create class', 'error'); // Use toast
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="page fade-in">
			<h2>Create New Course Content</h2>
			<form onSubmit={handleCreate} className="form">
				{step === 1 && (
					<div className="fade-in">
						<h3>Step 1: Class Details</h3>
						<label>
							Class Name
							<input type="text" value={className} onChange={(e) => setClassName(e.target.value)} placeholder="e.g., Algebra I" required />
						</label>
						<label>
							Description
							<textarea value={classDescription} onChange={(e) => setClassDescription(e.target.value)} placeholder="Optional details about the class" />
						</label>
						<button type="button" onClick={nextStep} disabled={!className.trim()}>Next</button>
					</div>
				)}

				{step === 2 && (
					<div className="fade-in">
						<h3>Step 2: Chapter Details</h3>
						<label>
							Chapter Name
							<input type="text" value={chapterName} onChange={(e) => setChapterName(e.target.value)} placeholder="e.g., Linear Equations" required />
						</label>
						<div className="form-navigation">
							<button type="button" onClick={prevStep}>Previous</button>
							<button type="button" onClick={nextStep} disabled={!chapterName.trim()}>Next</button>
						</div>
					</div>
				)}

				{step === 3 && (
					<div className="fade-in">
						<h3>Step 3: Topic Details</h3>
						<label>
							Topic Name
							<input type="text" value={topicName} onChange={(e) => setTopicName(e.target.value)} placeholder="e.g., Solving for X" required />
						</label>
						<div className="form-navigation">
							<button type="button" onClick={prevStep}>Previous</button>
							<button type="submit" disabled={loading || !topicName.trim()}>{loading ? 'Creating...' : 'Create Course Content'}</button>
						</div>
					</div>
				)}

				{message && <p className="fade-in">{message}</p>} {/* Remove or comment this line */}
			</form>
		</div>
	)
}



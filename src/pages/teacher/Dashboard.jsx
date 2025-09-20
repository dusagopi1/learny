import { useState, useEffect } from 'react'
import { FaLaptopCode, FaChalkboardTeacher } from 'react-icons/fa'
import { auth, db } from '../../firebase-config'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../components/Toast';

export default function TeacherDashboard() {
	const { showToast } = useToast();
	const [progress, setProgress] = useState(0) // Keep for potential overall progress
	const [createdClasses, setCreatedClasses] = useState([])
	const [loadingClasses, setLoadingClasses] = useState(true)
	const navigate = useNavigate()

	useEffect(() => {
		// Simulate overall progress animation if needed in the future
		const timer = setTimeout(() => setProgress(75), 500)
		return () => clearTimeout(timer)
	}, [])

	useEffect(() => {
		const user = auth.currentUser
		if (!user) {
			setLoadingClasses(false)
			return
		}

		const q = query(collection(db, 'classes'), where('ownerUid', '==', user.uid))
		const unsubscribe = onSnapshot(q, (snapshot) => {
			const classesData = []
			snapshot.forEach((doc) => {
				classesData.push({ id: doc.id, ...doc.data() })
			})
			setCreatedClasses(classesData)
			setLoadingClasses(false)
		}, (error) => {
			console.error("Error fetching classes: ", error)
			setLoadingClasses(false)
		})

		return () => unsubscribe()
	}, [])

	const getRandomProgress = () => Math.floor(Math.random() * 10) + 5 // Simulates items watched out of 10

	return (
		<div className="dashboard-page fade-in">
			{/* Banner Card */}
			<div className="banner-card">
				<div className="illustration"></div>
				<h2>Sharpen Your Skills With Professional Online Courses</h2>
				<p>Continue your journey and achieve your target</p>
				<button>Join Now</button>
			</div>

			{/* Progress Tracker Cards */}
			<div className="progress-tracker-cards">
				{loadingClasses && <p>Loading class progress...</p>}
				{!loadingClasses && createdClasses.length === 0 && <p>Create classes to see your progress here.</p>}
				{createdClasses.map((cls) => (
					<div className="progress-tracker-card" key={cls.id} onClick={() => navigate(`/teacher/class/${cls.id}`)}>
						<div className="icon"><FaLaptopCode /></div>
						<h4>{cls.name}</h4> {/* Translated class name */}
					</div>
				))}
			</div>

			{/* Recent Class Activity Section */}
			
			{/* </div> */}

			{/* Classes Created by You (Already dynamic) */}
			<div className="classes-created-section">
				<h3>Classes Created by You</h3>
				{loadingClasses && <p>Loading your classes...</p>}
				{!loadingClasses && createdClasses.length === 0 && <p>You haven't created any classes yet. Go to "Create class" to get started!</p>}
				<div className="continue-watching-cards"> {/* Reusing styling for card display */}
					{createdClasses.map((cls) => (
						<div className="video-card" key={cls.id} onClick={() => navigate(`/teacher/class/${cls.id}`)}>
							<img src="https://via.placeholder.com/300x150/6a05ad/ffffff?text=Class+Thumbnail" alt={`Thumbnail for ${cls.name}`} />
							<div className="video-card-content">
								<h4>{cls.name}</h4> {/* Translated class name */}
								<p>{cls.description}</p>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	)
}



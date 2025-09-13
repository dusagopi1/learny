import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase-config'
import { doc, getDoc, updateDoc, collection, query, where, getDocs, arrayRemove } from 'firebase/firestore'
import { signOut } from 'firebase/auth'; // Import signOut
import { FaTrash, FaUserCircle } from 'react-icons/fa' // Import FaTrash for delete button

export default function TeacherProfile() {
	const [displayName, setDisplayName] = useState('')
	const [loading, setLoading] = useState(true)
	const [message, setMessage] = useState('')
	const navigate = useNavigate(); // Initialize navigate

	useEffect(() => {
		async function load() {
			const user = auth.currentUser
			if (!user) {
				setLoading(false);
				return;
			}
			const userDocRef = doc(db, 'users', user.uid);
			const userSnap = await getDoc(userDocRef);
			if (userSnap.exists()) {
				setDisplayName(userSnap.data().displayName || '')
			}

			setLoading(false)
		}
		load()
	}, [auth.currentUser]) // Depend on auth.currentUser to refetch if user changes

	async function save(e) {
		e.preventDefault()
		setMessage('')
		const user = auth.currentUser
		if (!user) return
		await updateDoc(doc(db, 'users', user.uid), { displayName })
		setMessage('Profile updated.')
	}

	const handleLogout = async () => {
		try {
			await signOut(auth);
			navigate('/login'); // Redirect to login page after logout
		} catch (error) {
			console.error("Error logging out:", error);
			setMessage('Failed to log out. Please try again.');
		}
	};

	if (loading) return <p>Loading...</p>

	return (
		<div className="page fade-in">
			<h2 className="profile-header">Your Profile</h2>

			<div className="profile-card">
				<div className="profile-avatar-wrapper">
					<img src="/assets/react.svg" className="profile-avatar" alt="Profile" /> {/* Placeholder for avatar */}
				</div>
				<h3>Good Morning {displayName || 'Teacher'}</h3> {/* Use dynamic display name */}
				<p>Continue Your Journey And Achieve Your Target</p>
			</div>

			<h3 className="section-title">Edit Profile</h3>
			<form onSubmit={save} className="form profile-form">
				<label>
					Display name
					<input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
				</label>
				<button type="submit">Save</button>
				{message && <p className="feedback-message">{message}</p>}
			</form>
			<button onClick={handleLogout} className="form-button logout-button">Logout</button>

		</div>
	)
}



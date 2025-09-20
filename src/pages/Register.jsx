import React, { useState } from 'react'
import { auth, db } from '../firebase-config'
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from 'firebase/auth' // Import GoogleAuthProvider and signInWithPopup
import { doc, setDoc, getDoc } from 'firebase/firestore' // Import getDoc
import { useToast } from '../components/Toast' // Import useToast hook
import { Link, useNavigate } from 'react-router-dom' // Import Link and useNavigate for redirection
import AuthLayout from '../components/AuthLayout'; // Import AuthLayout

export default function Register() {
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [displayName, setDisplayName] = useState('')
	const [role, setRole] = useState('student')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('') // This can be removed after implementing toast
	const { showToast } = useToast(); // Use the toast hook
	const navigate = useNavigate(); // For redirection

	async function handleSubmit(e) {
		e.preventDefault()
		setError('') // Remove or comment this line
		setLoading(true)
		try {
			const cred = await createUserWithEmailAndPassword(auth, email, password)
			if (displayName) {
				await updateProfile(cred.user, { displayName })
			}
			await setDoc(doc(db, 'users', cred.user.uid), {
				uuid: cred.user.uid,
				email,
				displayName: displayName || '',
				role,
				createdAt: new Date().toISOString(),
			})
			showToast('Registration successful', 'success'); // Use toast
			navigate('/login'); // Redirect to login after successful registration
		} catch (err) {
			showToast(err.message || 'Failed to register', 'error'); // Use toast
		} finally {
			setLoading(false)
		}
	}

	async function handleGoogleSignIn() {
		setLoading(true);
		setError(''); // Clear previous errors
		try {
			const provider = new GoogleAuthProvider();
			const result = await signInWithPopup(auth, provider);
			const user = result.user;

			const userRef = doc(db, 'users', user.uid);
			const userDoc = await getDoc(userRef);

			let userRole = 'student'; // Default role for Google sign-ups
			if (userDoc.exists()) {
				userRole = userDoc.data().role || 'student';
			} else {
				// Create user profile if it doesn't exist
				await setDoc(userRef, {
					uuid: user.uid,
					email: user.email,
					displayName: user.displayName || '',
					role: userRole, // Default to student
					createdAt: new Date().toISOString(),
				}, { merge: true });
			}
			const redirectTo = userRole === 'teacher' ? '/teacher' : '/student';
			navigate(redirectTo, { replace: true });
			showToast('Signed up with Google successfully', 'success');
		} catch (err) {
			console.error("Google sign-up error:", err);
			showToast(err.message || 'Failed to sign up with Google', 'error');
		} finally {
			setLoading(false);
		}
	}

	return (
		<AuthLayout>
			<div className="auth-form-content">
				<h2>Create your account</h2>
				<form onSubmit={handleSubmit} className="auth-form">
					<label>
						Name
						<input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
					</label>
					<label>
						Email
						<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email" required />
					</label>
					<label>
						Password
						<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 6 characters" required />
					</label>
					<fieldset className="role-fieldset">
						<legend>I am a:</legend>
						<label>
							<input type="radio" name="role" value="student" checked={role === 'student'} onChange={() => setRole('student')} /> Student
						</label>
						<label>
							<input type="radio" name="role" value="teacher" checked={role === 'teacher'} onChange={() => setRole('teacher')} /> Teacher
						</label>
					</fieldset>
					{error && <p className="error">{error}</p>} {/* Remove or comment this line */}
					<button type="submit" disabled={loading} className="primary-auth-btn">{loading ? 'Creating...' : 'Create account'}</button>
				</form>
				<div className="divider">OR</div>
				<button onClick={handleGoogleSignIn} disabled={loading} className="google-signin-btn">
					Sign up with Google
				</button>
				<p>Already have an account? <Link to="/login">Login</Link></p>
			</div>
		</AuthLayout>
	)
}



import { useState } from 'react'
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth' // Import GoogleAuthProvider and signInWithPopup
import { auth, db } from '../firebase-config'
import { Link, useNavigate, useLocation } from 'react-router-dom' // Import useLocation
import { doc, getDoc, setDoc } from 'firebase/firestore' // Import setDoc
import { useToast } from '../components/Toast' // Import useToast hook
import AuthLayout from '../components/AuthLayout'; // Import AuthLayout

export default function Login() {
	const navigate = useNavigate()
	const location = useLocation() // Get location object to read state
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('') // This can be removed after implementing toast
	const { showToast } = useToast(); // Use the toast hook

	async function handleSubmit(e) {
		e.preventDefault()
		setError('') // Remove or comment this line
		setLoading(true)
		try {
			const cred = await signInWithEmailAndPassword(auth, email, password)
			const userRef = doc(db, 'users', cred.user.uid)
			const userDoc = await getDoc(userRef)

			let role = 'student' // Default role
			if (userDoc.exists()) {
				role = userDoc.data().role || 'student'
			} else {
				// If user profile doesn't exist, create a basic one with default role
				console.log("Creating new user profile on login for UID:", cred.user.uid);
				await setDoc(userRef, {
					uuid: cred.user.uid,
					email: cred.user.email,
					displayName: cred.user.displayName || '',
					role: 'student', // Default to student
					createdAt: new Date().toISOString(),
				}, { merge: true }); // Use merge: true to avoid overwriting if a doc somehow partially exists
				// After creating, now fetch it again to ensure it exists
				const updatedUserDoc = await getDoc(userRef);
				if (updatedUserDoc.exists()) {
					role = updatedUserDoc.data().role || 'student';
				}
			}

			// Check for redirect path from location state
			const redirectTo = location.state?.redirect || (role === 'teacher' ? '/teacher' : '/student');
			navigate(redirectTo, { replace: true });
			showToast('Logged in successfully!', 'success');
		} catch (err) {
			showToast(err.message || 'Failed to login', 'error');
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

			let role = 'student'; // Default role
			if (userDoc.exists()) {
				role = userDoc.data().role || 'student';
			} else {
				// Create user profile if it doesn't exist
				await setDoc(userRef, {
					uuid: user.uid,
					email: user.email,
					displayName: user.displayName || '',
					role: 'student', // Default to student
					createdAt: new Date().toISOString(),
				}, { merge: true });
			}
			const redirectTo = location.state?.redirect || (role === 'teacher' ? '/teacher' : '/student');
			navigate(redirectTo, { replace: true });
			showToast('Logged in with Google successfully!', 'success');
		} catch (err) {
			console.error("Google sign-in error:", err);
			showToast(err.message || 'Failed to sign in with Google', 'error');
		} finally {
			setLoading(false);
		}
	}

	return (
		<AuthLayout>
			<div className="auth-form-content">
				<h2>Login to Learnly</h2>
				{location.state?.message && <p className="error">{location.state.message}</p>} {/* Display redirect message */}
				<form onSubmit={handleSubmit} className="auth-form">
					<label>
						Email
						<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
					</label>
					<label>
						Password
						<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
					</label>
					{error && <p className="error">{error}</p>} {/* Remove or comment this line */}
					<button type="submit" disabled={loading} className="primary-auth-btn">{loading ? 'Signing in...' : 'Sign in'}</button>
				</form>
				<div className="divider">OR</div>
				<button onClick={handleGoogleSignIn} disabled={loading} className="google-signin-btn">
					Sign in with Google
				</button>
				<p>Don't have an account? <Link to="/register">Register</Link></p>
			</div>
		</AuthLayout>
	)
}



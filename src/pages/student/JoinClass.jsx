import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore'
import { auth, db } from '../../firebase-config'
import { onAuthStateChanged } from 'firebase/auth'

export default function JoinClass() {
  const { classId, invitationCode } = useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('Checking invitation link...')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // User not logged in, redirect to login with a message
        navigate(`/login?redirect=/join-class/${classId}/${invitationCode}`, { state: { message: 'Please log in or sign up to join the class.' } })
      } else {
        // User is logged in, attempt to join class
        handleJoinClass()
      }
    }
  }, [user, loading, classId, invitationCode, navigate])

  const handleJoinClass = async () => {
    if (!user || !classId || !invitationCode) {
      setMessage('Invalid link or user not authenticated.')
      return
    }

    try {
      const classRef = doc(db, 'classes', classId)
      const classSnap = await getDoc(classRef)

      if (!classSnap.exists()) {
        setMessage('Class not found or invalid invitation code.')
        return
      }

      const classData = classSnap.data()
      // Here, you could add logic to verify the invitationCode if it were more complex.
      // For now, we assume classId in URL is sufficient if the class exists.
      // If `invitationCode` was a real unique token, you'd check it against classData.invitationCode
      if (invitationCode !== classId) { // Basic check, assuming invitationCode === classId for now
        setMessage('Invalid invitation code.');
        return;
      }

      const userRef = doc(db, 'users', user.uid)
      const userSnap = await getDoc(userRef)

      if (userSnap.exists()) {
        const userData = userSnap.data()
        if (userData.enrolledClasses && userData.enrolledClasses.includes(classId)) {
          setMessage('You are already enrolled in this class.')
        } else {
          await updateDoc(userRef, {
            enrolledClasses: arrayUnion(classId),
          })
          setMessage('Successfully joined the class!')
        }
        // Redirect to student dashboard or class view after joining/checking
        navigate(`/student`)
      } else {
        console.log("User profile not found for UID:", user.uid); // Added for debugging
        setMessage('User profile not found.')
      }

    } catch (error) {
      console.error("Error joining class:", error)
      setMessage('Failed to join class. Please try again.')
    }
  }

  return (
    <div className="student-main-content fade-in">
      <h2>Join Class</h2>
      <p>{message}</p>
      {message === 'Successfully joined the class!' && (
        <p>Redirecting to your dashboard...</p>
      )}
    </div>
  )
}

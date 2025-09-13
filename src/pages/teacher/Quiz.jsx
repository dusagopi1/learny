import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { db } from '../../firebase-config'
import { collection, query, where, onSnapshot } from 'firebase/firestore'

export default function TeacherQuiz() {
  const { classId } = useParams()
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNewExerciseModal, setShowNewExerciseModal] = useState(false) // State to control modal visibility

  useEffect(() => {
    if (!classId) return

    const q = query(collection(db, 'exercises'), where('classId', '==', classId))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedExercises = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setExercises(fetchedExercises)
      setLoading(false)
    }, (error) => {
      console.error("Error fetching exercises:", error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [classId])

  if (loading) {
    return <div className="class-main-content">Loading quizzes...</div>
  }

  return (
    <div className="class-main-content fade-in">
      <h2>Quizzes & Exercises</h2>
      <button className="add-exercise-btn" onClick={() => setShowNewExerciseModal(true)}>Add New Exercise</button>

      {exercises.length === 0 ? (
        <p>No exercises created yet. Click "Add New Exercise" to get started!</p>
      ) : (
        <div className="exercises-grid">
          {exercises.map(exercise => (
            <div key={exercise.id} className="exercise-card">
              <h3>{exercise.title}</h3>
              <p>{new Date(exercise.createdAt).toLocaleDateString()}</p>
              {/* Link to exercise details/edit page later */}
            </div>
          ))}
        </div>
      )}

      {/* NewExerciseModal will be rendered here later */}

    </div>
  )
}

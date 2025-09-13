import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { db } from '../../firebase-config'
import { collection, query, where, getDocs } from 'firebase/firestore'

export default function StudentPerformance() {
  const { classId } = useParams()
  const [studentPerformanceData, setStudentPerformanceData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPerformanceData = async () => {
      setLoading(true)
      try {
        const studentsRef = collection(db, 'users')
        const qStudents = query(studentsRef, where('role', '==', 'student'))
        const studentsSnap = await getDocs(qStudents)

        const performanceData = []
        studentsSnap.forEach(studentDoc => {
          const studentData = studentDoc.data()
          const studentId = studentDoc.id
          const displayName = studentData.displayName || 'Anonymous'

          const classQuizzes = (studentData.attemptedQuizzes || []).filter(
            quiz => quiz.classId === classId
          )

          if (classQuizzes.length > 0) {
            const totalScore = classQuizzes.reduce((sum, quiz) => sum + quiz.score, 0)
            const averageScore = totalScore / classQuizzes.length
            performanceData.push({
              name: displayName,
              score: averageScore,
            })
          }
        })
        setStudentPerformanceData(performanceData)
      } catch (error) {
        console.error("Error fetching student performance data:", error)
      } finally {
        setLoading(false)
      }
    }

    if (classId) {
      fetchPerformanceData()
    }
  }, [classId])

  const getPerformanceCategory = (score) => {
    if (score >= 90) return 'Excellent'
    if (score >= 80) return 'Good'
    if (score >= 70) return 'Average'
    return 'Needs Improvement'
  }

  const categorizedData = studentPerformanceData.reduce((acc, student) => {
    const category = getPerformanceCategory(student.score)
    acc[category] = (acc[category] || 0) + 1
    return acc
  }, {})

  const pieData = Object.keys(categorizedData).map(category => ({
    name: category,
    value: categorizedData[category],
  }))

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

  if (loading) {
    return <div className="page fade-in">Loading student performance...</div>
  }

  if (studentPerformanceData.length === 0) {
    return <div className="page fade-in">No student performance data available for this class yet.</div>
  }

  return (
    <div className="page fade-in">
      <h2>Student Performance Analytics for Class: {classId}</h2>
      <p>This section displays graphs and pie charts for student performance in this class.</p>

      <div style={{ width: '100%', height: 300 }}>
        <h3>Student Average Scores (Bar Chart)</h3>
        <ResponsiveContainer>
          <BarChart
            data={studentPerformanceData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="score" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ width: '100%', height: 300, marginTop: '20px' }}>
        <h3>Performance Distribution (Pie Chart)</h3>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

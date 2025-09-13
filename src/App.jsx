import './App.css'
import { createBrowserRouter, RouterProvider, Outlet, Link } from 'react-router-dom'
import Register from './pages/Register'
import Login from './pages/Login'
import TeacherLayout from './pages/teacher/Layout'
import TeacherDashboard from './pages/teacher/Dashboard'
import TeacherCreateClass from './pages/teacher/CreateClass'
import TeacherCommunity from './pages/teacher/Community'
import TeacherNotifications from './pages/teacher/Notifications'
import TeacherProfile from './pages/teacher/Profile'
import ClassDetails, { ClassNewsFeed, ClassContent, ClassLeaderboard } from './pages/teacher/ClassDetails'
import StudentLayout from './pages/student/Layout' // Import StudentLayout
import StudentDashboard from './pages/student/Dashboard' // Will be a child of StudentLayout
import JoinClass from './pages/student/JoinClass' // Import JoinClass component
import StudentClassView, { StudentClassContent, StudentClassSubmissions, StudentClassLeaderboard, StudentPerformanceView } from './pages/student/ClassView' // Import StudentClassView and its children
import TeacherExerciseDetails from './pages/teacher/ExerciseDetails' // Import TeacherExerciseDetails
import TopicContent from './pages/teacher/TopicContent'
import StudentExerciseView from './pages/student/StudentExerciseView' // Import StudentExerciseView
import StudentLeaderboard from './pages/student/StudentLeaderboard' // Import StudentLeaderboard
import StudentPerformance from './pages/teacher/StudentPerformance' // Import StudentPerformance
import StudentAiQuizView from './pages/student/StudentAiQuizView' // Import StudentAiQuizView
import ClassNewsFeedStudent from './pages/student/ClassNewsFeedStudent' // Import ClassNewsFeedStudent
import CommunityStudent from './pages/student/CommunityStudent' // Import CommunityStudent
import { ToastProvider } from './components/Toast'

function RootLayout() {
	return (
		<>
			<nav className="top-nav">
				
			</nav>
			<Outlet />
		</>
	)
}

const router = createBrowserRouter(
	[
		{
			element: <RootLayout />,
			children: [
				{ path: '/', element: <Login /> },
				{ path: '/login', element: <Login /> },
				{ path: '/register', element: <Register /> },
				{
					path: '/teacher',
					element: <TeacherLayout />,
					children: [
						{ index: true, element: <TeacherDashboard /> },
						{ path: 'create-class', element: <TeacherCreateClass /> },
						{ path: 'community', element: <TeacherCommunity /> },
						{ path: 'notifications', element: <TeacherNotifications /> },
						{ path: 'profile', element: <TeacherProfile /> },
						{ path: 'class/:classId', element: <ClassDetails />, children: [
							{ path: 'news-feed', element: <ClassNewsFeed /> },
							{ path: 'content', element: <ClassContent /> },
							{ path: 'submissions', element: <ClassLeaderboard /> },
							{ path: 'performance', element: <StudentPerformance /> },
							{ path: 'content/chapter/:chapterId/topic/:topicId', element: <TopicContent /> },
							{ path: 'content/chapter/:chapterId/topic/:topicId/new-exercise', element: <TeacherExerciseDetails /> }, // New route for creating exercise
							{ path: 'content/chapter/:chapterId/topic/:topicId/exercise/:exerciseId', element: <TeacherExerciseDetails /> }
						] },
					],
				},
				{
					path: '/student',
					element: <StudentLayout />,
					children: [
						{ index: true, element: <StudentDashboard /> }, // Student Dashboard as a child
						{ path: 'leaderboard', element: <StudentLeaderboard /> }, // New route for leaderboard
						{ path: 'community', element: <CommunityStudent /> }, // New route for student community
					],
				},
				{ path: '/join-class/:classId/:invitationCode', element: <JoinClass /> }, // New route for joining classes
			],
		},
		{
			path: '/student/class/:classId',
			element: <StudentClassView />,
			children: [
				{ index: true, element: <ClassNewsFeedStudent /> }, // Default to news feed for students
				{ path: 'news-feed', element: <ClassNewsFeedStudent /> },
				{ path: 'content', element: <StudentClassContent /> },
				{ path: 'submissions', element: <StudentClassSubmissions /> },
				{ path: 'leaderboard', element: <StudentClassLeaderboard /> }, // New route for student leaderboard
				{ path: 'performance', element: <StudentPerformanceView /> }, // New route for student performance view
				{ path: 'content/chapter/:chapterId/topic/:topicId', element: <StudentClassContent /> },
				{ path: 'content/chapter/:chapterId/topic/:topicId/exercise/:exerciseId', element: <StudentExerciseView /> }, // New route for student exercise details
				{ path: 'content/chapter/:chapterId/topic/:topicId/ai-quiz/:exerciseId', element: <StudentAiQuizView /> } // New route for AI quiz
			],
		},
	],
	{
		future: {
			v7_startTransition: true,
			v7_relativeSplatPath: true,
		},
	}
)

function App() {
	return (
		<ToastProvider>
			<RouterProvider router={router} />
		</ToastProvider>
	)
}

export default App

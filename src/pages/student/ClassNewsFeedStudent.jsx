import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { db, auth } from '../../firebase-config';
import StudentDataLoader from '../../components/StudentDataLoader';

export default function ClassNewsFeedStudent() {
    const { classId } = useParams();
    const [newsFeedPosts, setNewsFeedPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isStudentEnrolled, setIsStudentEnrolled] = useState(false);

    useEffect(() => {
        if (!classId || !auth.currentUser) {
            setLoading(false);
            return;
        }

        const checkEnrollmentAndFetchPosts = async () => {
            try {
                setLoading(true);
                const userDocRef = doc(db, 'users', auth.currentUser.uid);
                const userSnap = await getDoc(userDocRef);

                if (userSnap.exists() && userSnap.data().enrolledClasses?.includes(classId)) {
                    setIsStudentEnrolled(true);
                    const postsRef = collection(db, 'classes', classId, 'newsFeed');
                    const qPosts = query(postsRef, orderBy('timestamp', 'desc'));

                    const unsubPosts = onSnapshot(qPosts, (snapshot) => {
                        const posts = snapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        }));
                        setNewsFeedPosts(posts);
                        setLoading(false);
                    }, (err) => {
                        console.error("Error fetching news feed for student:", err);
                        setError("Failed to load news feed.");
                        setLoading(false);
                    });

                    return () => unsubPosts(); // Cleanup listener
                } else {
                    setIsStudentEnrolled(false);
                    setError("You are not enrolled in this class or class not found.");
                    setLoading(false);
                }
            } catch (err) {
                console.error("Error checking enrollment or fetching news feed:", err);
                setError("An error occurred.");
                setLoading(false);
            }
        };

        checkEnrollmentAndFetchPosts();
    }, [classId, auth.currentUser]);

    if (loading) {
        return <StudentDataLoader />;
    }

    if (error) {
        return <div className="page fade-in error">Error: {error}</div>;
    }

    if (!isStudentEnrolled) {
        return <div className="page fade-in error">You must be enrolled in this class to view the news feed.</div>;
    }

    return (
        <div className="news-feed-section page fade-in">
            <h3>Class News Feed</h3>
            <div className="news-feed-posts">
                {newsFeedPosts.length === 0 ? (
                    <p className="content-placeholder">No announcements yet.</p>
                ) : (
                    newsFeedPosts.map(post => (
                        <div key={post.id} className="news-feed-post">
                            <p className="post-message">{post.message}</p>
                            <div className="post-meta">
                                <span>Posted by {post.teacherName} on {new Date(post.timestamp.seconds * 1000).toLocaleString()}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase-config';
import { FaPaperPlane, FaTrash } from 'react-icons/fa';

export default function CommunityStudent() {
	const [newPostMessage, setNewPostMessage] = useState('');
	const [communityPosts, setCommunityPosts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [userName, setUserName] = useState('');
	const [userRole, setUserRole] = useState('');

	useEffect(() => {
		const fetchUserData = async () => {
			if (auth.currentUser) {
				const userDocRef = doc(db, 'users', auth.currentUser.uid);
				const userSnap = await getDoc(userDocRef);
				if (userSnap.exists()) {
					setUserName(userSnap.data().displayName || 'Anonymous');
					setUserRole(userSnap.data().role || 'unknown');
				}
			}
		};

		fetchUserData();

		const postsRef = collection(db, 'communityPosts');
		const qPosts = query(postsRef, orderBy('timestamp', 'desc'));

		const unsub = onSnapshot(qPosts, (snapshot) => {
			const posts = snapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data()
			}));
			setCommunityPosts(posts);
			setLoading(false);
		}, (err) => {
			console.error("Error fetching community posts:", err);
			setError("Failed to load community posts.");
			setLoading(false);
		});

		return () => unsub();
	}, []);

	const handlePostThought = async (e) => {
		e.preventDefault();
		if (!newPostMessage.trim()) return;

		if (!auth.currentUser) {
			console.error("User not authenticated.");
			return;
		}

		try {
			await addDoc(collection(db, 'communityPosts'), {
				userId: auth.currentUser.uid,
				userName: userName || 'Anonymous',
				userRole: userRole || 'unknown',
				timestamp: new Date(),
				message: newPostMessage,
			});
			setNewPostMessage('');
		} catch (error) {
			console.error("Error posting thought:", error);
		}
	};

	const handleDeletePost = async (postId, postUserId) => {
		if (!auth.currentUser || (auth.currentUser.uid !== postUserId)) {
			alert('You can only delete your own posts.');
			return;
		}

		if (!confirm('Are you sure you want to delete this post?')) return;

		try {
			await deleteDoc(doc(db, 'communityPosts', postId));
		} catch (error) {
			console.error("Error deleting post:", error);
		}
	};

	if (loading) {
		return <div className="page fade-in">Loading community...</div>;
	}

	if (error) {
		return <div className="page fade-in error">Error: {error}</div>;
	}

	return (
		<div className="page fade-in">
			<h2>Community Discussion</h2>
			<form onSubmit={handlePostThought} className="community-post-form">
				<textarea
					value={newPostMessage}
					onChange={(e) => setNewPostMessage(e.target.value)}
					placeholder="Share your thoughts or ask a question..."
					rows="5"
					required
				></textarea>
				<button type="submit"><FaPaperPlane /> Post Thought</button>
			</form>

			<div className="community-posts-list">
				{communityPosts.length === 0 ? (
					<p className="content-placeholder">No posts yet. Be the first to share!</p>
				) : (
					communityPosts.map(post => (
						<div key={post.id} className="community-post-item">
							<p className="post-message">{post.message}</p>
							<div className="post-meta">
								<span>Posted by {post.userName} ({post.userRole}) on {new Date(post.timestamp.seconds * 1000).toLocaleString()}</span>
								{auth.currentUser && auth.currentUser.uid === post.userId && (
									<button onClick={() => handleDeletePost(post.id, post.userId)} className="icon-btn delete-icon" title="Delete Post"><FaTrash /></button>
								)}
							</div>
						</div>	
					))
				)}
			</div>
		</div>
	);
}

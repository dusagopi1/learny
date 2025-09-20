import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase-config';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { FaBell, FaCheckCircle } from 'react-icons/fa';

export default function StudentNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) {
        setStudentId(user.uid);
      } else {
        setStudentId(null);
        setNotifications([]);
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!studentId) return;

    const q = query(
      collection(db, 'notifications'),
      where('recipientId', 'in', [studentId, 'ALL_STUDENTS']),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('Fetched Notifications for Student:', fetchedNotifications); // Added console.log
      setNotifications(fetchedNotifications);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching notifications:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [studentId]);

  const markAsRead = async (notificationId) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), { read: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!studentId) return;

    const batch = writeBatch(db);
    const unreadUserNotifications = notifications.filter(n => !n.read && (n.recipientId === studentId || n.recipientId === 'ALL_STUDENTS'));

    unreadUserNotifications.forEach(notification => {
      const notificationRef = doc(db, 'notifications', notification.id);
      batch.update(notificationRef, { read: true });
    });

    try {
      await batch.commit();
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  if (loading) {
    return <div className="page fade-in">Loading notifications...</div>;
  }

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2><FaBell /> Notifications</h2>
        {notifications.some(n => !n.read) && (
          <button className="btn secondary-btn" onClick={markAllAsRead}>
            Mark All as Read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="content-placeholder">You have no notifications.</p>
      ) : (
        <div className="notifications-list">
          {notifications.map(notification => (
            <div key={notification.id} className={`notification-item ${notification.read ? 'read' : 'unread'}`}>
              <div className="notification-content">
                <p className="notification-message">{notification.message}</p>
                <span className="notification-time">{notification.createdAt?.toDate().toLocaleString()}</span>
              </div>
              {!notification.read && (
                <button className="icon-btn" onClick={() => markAsRead(notification.id)} title="Mark as Read">
                  <FaCheckCircle />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

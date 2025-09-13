import { useEffect, useState } from 'react'
import { auth, db } from '../../firebase-config'
import { collection, onSnapshot, query, where } from 'firebase/firestore'

export default function TeacherClassesDropdown() {
	const [classes, setClasses] = useState([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const user = auth.currentUser
		if (!user) return
		const q = query(collection(db, 'classes'), where('ownerUid', '==', user.uid))
		const unsub = onSnapshot(q, (snap) => {
			const items = []
			snap.forEach((doc) => items.push({ id: doc.id, ...doc.data() }))
			setClasses(items)
			setLoading(false)
		})
		return () => unsub()
	}, [])

	return (
		<div>
			<label>
				Your classes
				<select defaultValue="">
					<option value="" disabled>{loading ? 'Loading...' : 'Select a class'}</option>
					{classes.map((c) => (
						<option key={c.id} value={c.id}>{c.name || c.id}</option>
					))}
				</select>
			</label>
		</div>
	)
}



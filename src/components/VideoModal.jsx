import { useState } from 'react'
import { FaYoutube, FaUpload, FaTimes } from 'react-icons/fa'
import { storage } from '../firebase-config' // Corrected import path
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage' // Import storage functions and uploadBytesResumable
import { useToast } from './Toast' // Import useToast

export default function VideoModal({ onClose, onAddVideo, videosAddedCount }) {
	const [addMethod, setAddMethod] = useState('youtube') // 'youtube', 'upload'
	const [youtubeLink, setYoutubeLink] = useState('')
	const [selectedFile, setSelectedFile] = useState(null) // New state for file upload
	const [uploading, setUploading] = useState(false) // New state for upload status
	const [uploadProgress, setUploadProgress] = useState(0); // New state for upload progress
	const { showToast } = useToast(); // Use toast hook

	// Placeholder for videos added count
	

	const handleSubmit = async (e) => { // Make handleSubmit async
		e.preventDefault()
		
		if (addMethod === 'youtube' && youtubeLink.trim()) {
			onAddVideo({ type: 'youtube', url: youtubeLink.trim() })
			onClose()
			setYoutubeLink('')
		} else if (addMethod === 'upload' && selectedFile) {
			setUploading(true)
			setUploadProgress(0);
			try {
				const storageRef = ref(storage, `class_videos/${selectedFile.name}`)
				const uploadTask = uploadBytesResumable(storageRef, selectedFile);

				uploadTask.on('state_changed',
					(snapshot) => {
						const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
						setUploadProgress(progress);
						console.log('Upload is ' + progress + '% done'); // Add this line for debugging progress
					},
					(error) => {
						console.error("Error during upload:", error);
						showToast('Failed to upload video: ' + error.message, 'error'); // Use toast for error
						setUploading(false);
						setUploadProgress(0);
						setSelectedFile(null);
					},
					async () => {
						const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
						onAddVideo({ type: 'upload', url: downloadURL, name: selectedFile.name });
						showToast('Video uploaded successfully!', 'success'); // Use toast for success
						onClose();
						setSelectedFile(null);
						setUploading(false);
						setUploadProgress(0);
					}
				);
				
			} catch (error) {
				console.error("Error initiating upload:", error)
				showToast('Failed to initiate video upload. Please try again.', 'error'); // Use toast
				setUploading(false)
				setUploadProgress(0);
			}
		}

		// For upload, we'd handle file input separately
		
	}

	return (
		<div className="modal-overlay fade-in">
			<div className="video-modal">
				<div className="modal-header">
					<h3>Add a Video</h3>
					<button className="close-button" onClick={onClose}><FaTimes /></button>
				</div>
				<div className="modal-content">
					<div className="add-by-options">
						<h4>Add By</h4>
						<button
							className={`add-method-btn ${addMethod === 'youtube' ? 'active' : ''}`}
							onClick={() => setAddMethod('youtube')}
						>
							<FaYoutube /> Youtube Link
						</button>
						<button
							className={`add-method-btn ${addMethod === 'upload' ? 'active' : ''}`}
							onClick={() => setAddMethod('upload')}
						>
							<FaUpload /> Upload
						</button>
					</div>
					<form onSubmit={handleSubmit} className="add-video-form">
						{addMethod === 'youtube' && (
							<div className="form-group fade-in">
								<label htmlFor="youtubeLink">Youtube Link</label>
								<input
									type="text"
									id="youtubeLink"
									value={youtubeLink}
									onChange={(e) => setYoutubeLink(e.target.value)}
									placeholder="https://www.youtube.com/watch?v="
									required
								/>
								<p className="videos-added">Videos Added: {videosAddedCount}</p>
								<button type="submit" className="add-video-btn">Add Video</button>
							</div>
						)}
						{addMethod === 'upload' && (
							<div className="form-group fade-in">
								<label htmlFor="videoUpload">Upload Video</label>
								<input
									type="file"
									id="videoUpload"
									accept="video/*"
									onChange={(e) => setSelectedFile(e.target.files[0])}
									disabled={uploading}
								/>
								<p className="videos-added">Videos Added: {videosAddedCount}</p>
								<button type="submit" className="add-video-btn" disabled={!selectedFile || uploading}>
									{uploading ? `Uploading... ${uploadProgress.toFixed(0)}%` : 'Upload Video'}
								</button>
							</div>
						)}
					</form>
				</div>
			</div>
		</div>
	)
}

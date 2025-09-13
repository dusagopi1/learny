import { FaTimes } from 'react-icons/fa'

export default function AiConfirmModal({ topicName, onConfirm, onCancel, isLoading }) {
  return (
    <div className="modal-overlay fade-in">
      <div className="ai-confirm-modal">
        <div className="modal-header">
          <h3>Generate Notes with AI</h3>
          <button className="close-button" onClick={onCancel} disabled={isLoading}><FaTimes /></button>
        </div>
        <div className="modal-content">
          <p>Do you want to generate notes on the topic: <strong>{topicName}</strong>?</p>
          <div className="modal-actions">
            <button className="confirm-btn" onClick={onConfirm} disabled={isLoading}>{isLoading ? 'Generating...' : 'Yes'}</button>
            <button className="cancel-btn" onClick={onCancel} disabled={isLoading}>No</button>
          </div>
        </div>
      </div>
    </div>
  )
}

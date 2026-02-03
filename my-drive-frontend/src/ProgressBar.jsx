import "./directoryview.css";

export default function ProgressBar({
  progress,
  label,
  secondaryLabel,
  speed,
  cancelAction,
}) {
  return (
    <div className="upload">
      <div className="progress-header">
        <span className="progress-title">{label}</span>
        <span className="progress-percentage">{Math.round(progress)}%</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
      </div>
      <div className="progress-details">
        {speed && <span className="speed">{speed}</span>}
        {secondaryLabel && (
          <span className="secondary-label">{secondaryLabel}</span>
        )}
        {cancelAction && (
          <button className="cancel-btn" onClick={cancelAction}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

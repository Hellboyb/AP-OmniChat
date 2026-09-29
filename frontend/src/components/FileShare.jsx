import { useRef, useState } from "react";
import { Paperclip, Image as ImageIcon, FileText, X, Upload } from "lucide-react";
import "./FileShare.css";

export default function FileShare({ onFilesSelected, disabled = false }) {
  const inputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const handleChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setSelectedFiles((current) => [...current, ...files]);
    event.target.value = "";
  };

  const removeFile = (index) => {
    setSelectedFiles((current) => current.filter((_, i) => i !== index));
  };

  const sendFiles = () => {
    if (!selectedFiles.length) return;
    onFilesSelected?.(selectedFiles);
    setSelectedFiles([]);
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="file-share">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.txt,.zip"
        hidden
        onChange={handleChange}
        disabled={disabled}
      />

      <button
        type="button"
        className="file-share-trigger"
        title="Attach files or images"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
      >
        <Paperclip size={19} />
      </button>

      {selectedFiles.length > 0 && (
        <div className="file-share-preview">
          <div className="file-share-preview-heading">
            <strong>{selectedFiles.length} file(s) selected</strong>
            <button
              type="button"
              onClick={() => setSelectedFiles([])}
              aria-label="Clear selected files"
            >
              Clear all
            </button>
          </div>

          {selectedFiles.map((file, index) => (
            <div className="file-share-item" key={`${file.name}-${index}`}>
              {file.type.startsWith("image/") ? (
                <ImageIcon size={18} />
              ) : (
                <FileText size={18} />
              )}

              <div className="file-share-item-info">
                <span title={file.name}>{file.name}</span>
                <small>{formatSize(file.size)}</small>
              </div>

              <button
                type="button"
                onClick={() => removeFile(index)}
                aria-label={`Remove ${file.name}`}
              >
                <X size={16} />
              </button>
            </div>
          ))}

          <button
            type="button"
            className="file-share-send"
            onClick={sendFiles}
            disabled={disabled}
          >
            <Upload size={16} />
            Add selected files
          </button>
        </div>
      )}
    </div>
  );
}
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { uploadPhoto } from "../api/photos";

export function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [password, setPassword] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    // Create a local preview URL so user sees the image before uploading
    setPreview(URL.createObjectURL(selected));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!file) return setError("Please select a photo");
    if (!caption.trim()) return setError("Please add a caption");
    if (!password) return setError("Please enter the admin password");

    setIsUploading(true);
    try {
      await uploadPhoto(file, caption, password);
      navigate("/");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message.includes("401")
          ? "Wrong password"
          : "Upload failed. Please try again.");
      }
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="upload-page">
      <div className="upload-card">
        <h2>Upload a Memory</h2>
        <form onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor="photo">Photo</label>
            <input
              id="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileChange}
              className="file-input"
            />
            {preview && (
              <img src={preview} alt="Preview" className="preview-img" />
            )}
          </div>

          <div className="field-group">
            <label htmlFor="caption">Caption</label>
            <textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What's the memory behind this photo?"
              maxLength={280}
              rows={3}
            />
            <span className="char-count">{caption.length}/280</span>
          </div>

          <div className="field-group">
            <label htmlFor="password">Admin Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
            />
          </div>

          {error && (
            <p role="alert" className="error-text">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn-primary full-width"
            disabled={isUploading}
          >
            {isUploading ? "Uploading…" : "Upload Memory"}
          </button>
        </form>
      </div>
    </div>
  );
}
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchPhotos, fetchReactions, fetchComments, addReaction, addComment } from "../api/photos";
import type { Photo } from "../api/photos";

const EMOJIS = ["❤️", "🌟", "😊"];

function NamePopup({ onSave, onClose }: { onSave: (name: string) => void, onClose: () => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Please tell us your name so we know who you are!");
    setError("");
    onSave(name.trim());
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal cute-modal" onClick={(e) => e.stopPropagation()}>
        <h3>✨ Who is reacting? ✨</h3>
        <p>Just a quick name so we know who's leaving love!</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Your cute name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="name-input"
            maxLength={50}
            autoFocus
          />
          {error && <p className="error-text">{error}</p>}
          <div className="modal-actions">
            <button type="submit" className="btn-primary">
              Continue 💫
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InteractionModal({
  photo,
  reactorName,
  onClose,
}: {
  photo: Photo;
  reactorName: string;
  onClose: () => void;
}) {
  const [selectedEmoji, setSelectedEmoji] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const reactionMutation = useMutation({
    mutationFn: () => addReaction(photo.id, selectedEmoji, reactorName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reactions", photo.id] });
    },
    onError: () => setError("Failed to add reaction. Please try again."),
  });

  const commentMutation = useMutation({
    mutationFn: () => addComment(photo.id, reactorName, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", photo.id] });
    },
    onError: () => setError("Failed to add comment. Please try again."),
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEmoji && !comment.trim()) {
      return setError("Please select an emoji or write a comment!");
    }
    setError("");
    
    if (selectedEmoji) {
      await reactionMutation.mutateAsync();
    }
    
    if (comment.trim()) {
      await commentMutation.mutateAsync();
    }
    
    onClose();
  }

  const isPending = reactionMutation.isPending || commentMutation.isPending;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Interact with this memory</h3>
        <p className="subtitle" style={{marginBottom: "16px", color: "var(--text-secondary)"}}>
          Posting as: <strong>{reactorName}</strong>
        </p>
        <form onSubmit={handleSubmit}>
          <div className="emoji-row">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                className={`emoji-btn ${selectedEmoji === e ? "selected" : ""}`}
                onClick={() => setSelectedEmoji(selectedEmoji === e ? "" : e)}
              >
                {e}
              </button>
            ))}
          </div>
          <textarea
            placeholder="Leave a sweet comment... (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="comment-input"
            rows={3}
            maxLength={200}
            style={{width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)", marginTop: "16px", resize: "none"}}
          />
          {error && <p className="error-text">{error}</p>}
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isPending}
            >
              {isPending ? "Adding…" : "Interact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PhotoCard({ photo, onInteractRequest }: { photo: Photo, onInteractRequest: (photo: Photo) => void }) {
  const { data: reactions } = useQuery({
    queryKey: ["reactions", photo.id],
    queryFn: () => fetchReactions(photo.id),
  });

  const { data: comments } = useQuery({
    queryKey: ["comments", photo.id],
    queryFn: () => fetchComments(photo.id),
  });

  return (
    <div className="photo-card">
      <div className="photo-wrapper">
        <img src={photo.s3_url} alt={photo.caption} loading="lazy" />
        <div className="photo-overlay">
          <p className="caption">{photo.caption}</p>
        </div>
      </div>

      <div className="card-footer">
        <div className="reactions-row">
          {reactions && reactions.length > 0 ? (
            reactions.map((r) => (
              <span key={r.emoji} className="reaction-pill" title={r.names.join(", ")}>
                {r.emoji} {r.count}
              </span>
            ))
          ) : (
            <span className="no-reactions">No reactions yet</span>
          )}
        </div>
        <button
          className="react-btn"
          onClick={() => onInteractRequest(photo)}
        >
          + React / Comment
        </button>
      </div>
      
      {comments && comments.length > 0 && (
        <div className="comments-section">
          {comments.map((c) => (
            <div key={c.id} className="comment">
              <strong>{c.commenter_name}:</strong> {c.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Gallery() {
  const [userName, setUserName] = useState<string>("");
  const [showNamePopup, setShowNamePopup] = useState(false);
  const [interactingPhoto, setInteractingPhoto] = useState<Photo | null>(null);

  useEffect(() => {
    const storedName = localStorage.getItem("reactor_name");
    if (storedName) {
      setUserName(storedName);
    }
  }, []);

  const { data: photos, isLoading, isError } = useQuery({
    queryKey: ["photos"],
    queryFn: fetchPhotos,
  });

  function handleInteractRequest(photo: Photo) {
    if (!userName) {
      setInteractingPhoto(photo);
      setShowNamePopup(true);
    } else {
      setInteractingPhoto(photo);
    }
  }

  function handleSaveName(name: string) {
    localStorage.setItem("reactor_name", name);
    setUserName(name);
    setShowNamePopup(false);
  }

  if (isLoading) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        <p>Loading memories…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="error-state">
        <p>Failed to load photos. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="gallery-page">
      <div className="hero">
        <h1>Memory Gallery</h1>
        <p className="hero-sub">
          Welcome to our shared space! Drop anything you like, react to your favorite moments, and let's build a beautiful collection together.
        </p>
        <p className="cute-line">this is a shared space so drop anything u like</p>
      </div>

      {photos && photos.length === 0 ? (
        <div className="empty-state">
          <p>No memories yet... Be the first to drop something cute!</p>
        </div>
      ) : (
        <div className="photo-grid">
          {photos?.map((photo) => (
            <PhotoCard key={photo.id} photo={photo} onInteractRequest={handleInteractRequest} />
          ))}
        </div>
      )}

      {showNamePopup && (
        <NamePopup 
          onSave={handleSaveName} 
          onClose={() => {
            setShowNamePopup(false);
            setInteractingPhoto(null);
          }} 
        />
      )}

      {!showNamePopup && interactingPhoto && userName && (
        <InteractionModal
          photo={interactingPhoto}
          reactorName={userName}
          onClose={() => setInteractingPhoto(null)}
        />
      )}
    </div>
  );
}
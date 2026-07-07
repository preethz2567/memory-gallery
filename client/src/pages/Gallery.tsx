import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchPhotos, fetchReactions, addReaction } from "../api/photos";
import type { Photo } from "../api/photos";

const EMOJIS = ["❤️", "🌟", "😊"];

function ReactionModal({
  photo,
  onClose,
}: {
  photo: Photo;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => addReaction(photo.id, selectedEmoji, name),
    onSuccess: () => {
      // Refetch reactions after adding one
      queryClient.invalidateQueries({ queryKey: ["reactions", photo.id] });
      onClose();
    },
    onError: () => setError("Failed to add reaction. Please try again."),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Please enter your name");
    if (!selectedEmoji) return setError("Please select an emoji");
    setError("");
    mutation.mutate();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>React to this memory</h3>
        <form onSubmit={handleSubmit}>
          <div className="emoji-row">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                className={`emoji-btn ${selectedEmoji === e ? "selected" : ""}`}
                onClick={() => setSelectedEmoji(e)}
              >
                {e}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="name-input"
            maxLength={50}
          />
          {error && <p className="error-text">{error}</p>}
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Adding…" : "Add Reaction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PhotoCard({ photo }: { photo: Photo }) {
  const [showModal, setShowModal] = useState(false);

  const { data: reactions } = useQuery({
    queryKey: ["reactions", photo.id],
    queryFn: () => fetchReactions(photo.id),
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
          onClick={() => setShowModal(true)}
        >
          + React
        </button>
      </div>

      {showModal && (
        <ReactionModal photo={photo} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}

export function Gallery() {
  const { data: photos, isLoading, isError } = useQuery({
    queryKey: ["photos"],
    queryFn: fetchPhotos,
  });

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
            <PhotoCard key={photo.id} photo={photo} />
          ))}
        </div>
      )}
    </div>
  );
}
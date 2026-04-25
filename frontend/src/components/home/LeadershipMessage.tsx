interface LeadershipMessageProps {
  name: string;
  title: string;
  imageUrl?: string;
  message: string;
  designation?: string;
}

export function LeadershipMessage({ name, title, imageUrl, message, designation }: LeadershipMessageProps) {
  return (
    <div className="leadership-message">
      <div className="leadership-message__header">
        <div className="leadership-message__avatar">
          {imageUrl ? (
            <img src={imageUrl} alt={name} className="leadership-message__image" />
          ) : (
            <div className="leadership-message__placeholder">
              {name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
        <div className="leadership-message__info">
          <h3 className="leadership-message__name">{name}</h3>
          <p className="leadership-message__title">{title}</p>
          {designation && <p className="leadership-message__designation">{designation}</p>}
        </div>
      </div>
      <div className="leadership-message__content">
        <div className="leadership-message__quote-icon">"</div>
        <p className="leadership-message__text">{message}</p>
      </div>
    </div>
  );
}

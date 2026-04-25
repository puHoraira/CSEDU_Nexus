import { Calendar, User } from "lucide-react";

interface NewsCardProps {
  title: string;
  excerpt: string;
  date: string;
  author?: string;
  imageUrl?: string;
  category?: string;
  link?: string;
}

export function NewsCard({ title, excerpt, date, author, imageUrl, category, link }: NewsCardProps) {
  return (
    <article className="news-card">
      {imageUrl && (
        <div className="news-card__image-wrapper">
          <img src={imageUrl} alt={title} className="news-card__image" />
          {category && <span className="news-card__category">{category}</span>}
        </div>
      )}
      <div className="news-card__content">
        <h3 className="news-card__title">{title}</h3>
        <p className="news-card__excerpt">{excerpt}</p>
        <div className="news-card__meta">
          <span className="news-card__meta-item">
            <Calendar size={14} />
            {new Date(date).toLocaleDateString("en-US", { 
              year: "numeric", 
              month: "short", 
              day: "numeric" 
            })}
          </span>
          {author && (
            <span className="news-card__meta-item">
              <User size={14} />
              {author}
            </span>
          )}
        </div>
        {link && (
          <a href={link} className="news-card__link">
            Read More →
          </a>
        )}
      </div>
    </article>
  );
}

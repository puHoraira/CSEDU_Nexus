export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "loading-spinner--sm",
    md: "loading-spinner--md",
    lg: "loading-spinner--lg",
  };

  return (
    <div className={`loading-spinner ${sizeClasses[size]}`}>
      <div className="loading-spinner__circle"></div>
      <div className="loading-spinner__circle"></div>
      <div className="loading-spinner__circle"></div>
    </div>
  );
}

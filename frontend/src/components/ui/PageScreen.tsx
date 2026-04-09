type PageScreenProps = {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
};

export function PageScreen({ title, subtitle, children }: PageScreenProps) {
  return (
    <section className="page-screen">
      <div className="page-screen__header">
        <div>
          <p className="eyebrow">CSEDU Nexus</p>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="page-screen__body">
        {children ?? <div className="empty-state">Page scaffold ready.</div>}
      </div>
    </section>
  );
}
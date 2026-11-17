export default function PlannedTool({ title }: { title: string }) {
 return (
 <article className="animate-fade-in">
 <header style={{ marginTop: "3rem", marginBottom: "2rem" }}>
 <h1>{title}</h1>
 <p style={{ fontSize: "1.2rem", color: "var(--text-muted)" }}>
 This utility is planned and will be available soon.
 </p>
 </header>
 </article>
 );
}

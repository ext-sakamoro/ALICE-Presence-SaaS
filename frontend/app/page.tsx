import Link from 'next/link';

const features = [
  { title: 'ZKP Privacy', desc: 'Zero-knowledge proof presence — verify without revealing identity' },
  { title: 'Vivaldi Coordinates', desc: 'Network coordinate system for latency-based proximity estimation' },
  { title: 'Real-time Status', desc: 'Phase-synchronized presence updates across all connected clients' },
  { title: 'Privacy Levels', desc: 'Public, friends-only, minimal, and ZKP-only privacy modes' },
];

const useCases = ['Metaverse', 'Multiplayer Games', 'Collaboration Tools', 'Social Apps', 'Remote Work'];

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">ALICE Presence</h1>
          <div className="flex gap-3">
            <Link href="/auth/login" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Sign in</Link>
            <Link href="/auth/register" className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90">Get Started</Link>
          </div>
        </div>
      </header>
      <main>
        <section className="max-w-6xl mx-auto px-6 py-20 text-center">
          <h2 className="text-4xl font-bold mb-4">Privacy-First Real-Time Presence</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">ZKP-protected presence management with Vivaldi network coordinates. GDPR-ready privacy for metaverse and real-time applications.</p>
          <Link href="/dashboard/console" className="px-6 py-3 bg-primary text-primary-foreground rounded-md font-medium hover:opacity-90">Launch Console</Link>
        </section>
        <section className="max-w-6xl mx-auto px-6 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((f) => (
              <div key={f.title} className="border border-border rounded-lg p-6">
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="max-w-6xl mx-auto px-6 pb-20">
          <h3 className="text-xl font-semibold mb-4 text-center">Use Cases</h3>
          <div className="flex flex-wrap justify-center gap-3">
            {useCases.map((u) => <span key={u} className="px-4 py-2 bg-muted rounded-full text-sm">{u}</span>)}
          </div>
        </section>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-md rounded-3xl bg-surface p-8">
        <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-crimson font-heading text-lg font-bold text-white">
          H
        </div>
        <h1 className="font-heading text-3xl font-bold">Handover</h1>
        <p className="mt-2 text-muted">
          A weekly check-in that becomes a living project memory. Scaffold ready.
        </p>
      </div>
    </main>
  );
}

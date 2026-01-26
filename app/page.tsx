export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-4">
          type-it-up
        </h1>
        <p className="text-center text-lg">
          Transform photos and PDFs of handwritten lecture notes into clean,
          professional LaTeX and Markdown that compiles without errors.
        </p>
        <p className="text-center text-sm mt-4 text-gray-600">
          Take pictures of your notes. Get publishable notes.
        </p>
      </div>
    </main>
  );
}

"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-sm font-bold text-black/50">Something went wrong.</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-black px-5 py-2 text-sm font-black text-white active:opacity-70"
      >
        Try again
      </button>
    </div>
  );
}

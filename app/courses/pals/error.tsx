"use client";

export default function PalsSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-8">
      <h2 className="text-lg font-semibold text-red-400">PALS page error</h2>
      <p className="mt-2 text-sm text-zinc-300">
        {error.message || "An unexpected error occurred."}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 rounded-lg border border-red-800/60 bg-red-950/40 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-950/60"
      >
        Try again
      </button>
    </div>
  );
}

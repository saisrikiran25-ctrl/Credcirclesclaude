import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md rounded-3xl border border-line bg-surface p-8 text-center">
      <h1 className="font-display text-xl font-semibold">We could not find that</h1>
      <p className="mt-1 text-sm text-muted">It may not exist, or you may not be a member of that circle.</p>
      <div className="mt-5"><LinkButton href="/home">Back home</LinkButton></div>
    </div>
  );
}

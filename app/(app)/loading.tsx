export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-4">
      <div className="skeleton h-9 w-2/3" />
      <div className="skeleton h-40 w-full" />
      <div className="grid grid-cols-2 gap-3"><div className="skeleton h-24" /><div className="skeleton h-24" /></div>
      <div className="skeleton h-28 w-full" />
    </div>
  );
}

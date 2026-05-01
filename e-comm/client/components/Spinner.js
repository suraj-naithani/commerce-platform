export default function Spinner({ label = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#dce9d5] border-t-[#6f9a5f]" />
      <p className="text-sm text-[#6e877a]">{label}</p>
    </div>
  );
}

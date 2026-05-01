export default function Input({ className = "", ...props }) {
  return (
    <input
      className={`w-full rounded-xl border border-[#d6e3cf] bg-white px-4 py-3 text-sm text-[#2b4036] placeholder:text-[#8ea695] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7ea66d] ${className}`}
      {...props}
    />
  );
}

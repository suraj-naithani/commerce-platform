export default function Button({ children, className = "", variant = "primary", ...props }) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7ea66d]";
  const styles = {
    primary: "bg-[#6f9a5f] text-white hover:bg-[#5f8750]",
    secondary: "bg-white text-[#365242] border border-[#d6e3cf] hover:bg-[#f4f8ef]",
  };

  return (
    <button className={`${base} ${styles[variant] || styles.primary} ${className}`} {...props}>
      {children}
    </button>
  );
}

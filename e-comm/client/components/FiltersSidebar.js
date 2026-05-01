export default function FiltersSidebar({
  categories,
  selectedCategory,
  onCategoryChange,
}) {
  return (
    <aside className="h-fit self-start rounded-2xl border border-[#deead8] bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-[#2f453b]">Filters</h2>

      <div className="mt-5">
        <p className="mb-2 text-sm font-medium text-[#4e675b]">Category</p>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-[#6f867a]">
            <input
              type="checkbox"
              checked={selectedCategory === ""}
              onChange={() => onCategoryChange("")}
              className="h-4 w-4 rounded border-[#c7d8bf]"
            />
            All Categories
          </label>
          {categories.map((category) => (
            <label key={category} className="flex items-center gap-2 text-sm text-[#6f867a]">
              <input
                type="checkbox"
                checked={selectedCategory === category}
                onChange={() => onCategoryChange(selectedCategory === category ? "" : category)}
                className="h-4 w-4 rounded border-[#c7d8bf]"
              />
              {category}
            </label>
          ))}
        </div>
      </div>

    </aside>
  );
}

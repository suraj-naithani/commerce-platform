import Input from "./Input";

export default function FiltersSidebar({ categories }) {
  return (
    <aside className="rounded-2xl border border-[#deead8] bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-[#2f453b]">Filters</h2>

      <div className="mt-5">
        <p className="mb-2 text-sm font-medium text-[#4e675b]">Category</p>
        <div className="space-y-2">
          {categories.map((category) => (
            <label key={category.id} className="flex items-center gap-2 text-sm text-[#6f867a]">
              <input type="checkbox" className="h-4 w-4 rounded border-[#c7d8bf]" />
              {category.name}
            </label>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-sm font-medium text-[#4e675b]">Price range</p>
        <div className="space-y-2">
          <Input placeholder="Min price" />
          <Input placeholder="Max price" />
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-sm font-medium text-[#4e675b]">Sort</p>
        <select className="w-full rounded-xl border border-[#d6e3cf] bg-white px-3 py-3 text-sm text-[#4f675b]">
          <option>Price: Low to High</option>
          <option>Price: High to Low</option>
        </select>
      </div>
    </aside>
  );
}

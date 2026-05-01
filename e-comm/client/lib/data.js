export const categories = [
  { id: "dog-food", name: "Dog Food", description: "Balanced meals for energetic dogs." },
  { id: "cat-food", name: "Cat Food", description: "Soft and nutrient rich recipes for cats." },
  { id: "treats", name: "Healthy Treats", description: "Reward snacks with clean ingredients." },
  { id: "supplements", name: "Supplements", description: "Daily support for immunity and digestion." },
];

export const products = [
  {
    id: "1",
    name: "Salmon Bites",
    category: "cat-food",
    price: 24,
    description: "Protein rich salmon recipe with omega oils for shiny fur.",
    ingredients: "Salmon, pumpkin, brown rice, flaxseed oil.",
    image: "/window.svg",
  },
  {
    id: "2",
    name: "Chicken Feast",
    category: "dog-food",
    price: 29,
    description: "Lean chicken and vegetables for daily gut friendly meals.",
    ingredients: "Chicken, sweet potato, peas, natural vitamins.",
    image: "/globe.svg",
  },
  {
    id: "3",
    name: "Calm Chews",
    category: "supplements",
    price: 18,
    description: "Support calm behavior during travel and noisy days.",
    ingredients: "Chamomile, magnesium, L-theanine.",
    image: "/file.svg",
  },
  {
    id: "4",
    name: "Turkey Crunch",
    category: "treats",
    price: 14,
    description: "Crunchy turkey rewards with no artificial flavors.",
    ingredients: "Turkey, oats, coconut oil.",
    image: "/next.svg",
  },
  {
    id: "5",
    name: "Lamb Bowl",
    category: "dog-food",
    price: 31,
    description: "Slow-cooked lamb blend for active dogs.",
    ingredients: "Lamb, carrots, quinoa, sunflower oil.",
    image: "/vercel.svg",
  },
  {
    id: "6",
    name: "Ocean Mix",
    category: "cat-food",
    price: 27,
    description: "Delicate fish blend for sensitive tummies.",
    ingredients: "Tuna, cod, rice, fish oil.",
    image: "/window.svg",
  },
];

export const testimonials = [
  { id: "t1", name: "Aanya", quote: "My retriever loves every meal. Packaging and quality feel premium." },
  { id: "t2", name: "Rahul", quote: "Simple checkout and clean ingredient list. Exactly what I wanted." },
  { id: "t3", name: "Sara", quote: "Our cat is picky, but this worked from day one." },
];

export function getCategoryName(categoryId) {
  return categories.find((item) => item.id === categoryId)?.name || "All";
}

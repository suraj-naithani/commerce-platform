export const categories = [
  { id: "grocery", name: "Grocery", description: "Fresh pantry picks for everyday cooking." },
  { id: "snacks", name: "Snacks", description: "Crispy, sweet, and savory favorites." },
  { id: "beverages", name: "Beverages", description: "Juices, teas, and ready-to-drink options." },
  { id: "household", name: "Household", description: "Daily use essentials for your home." },
];

export const products = [
  {
    id: "1",
    name: "Organic Bananas",
    category: "grocery",
    price: 2.49,
    description: "Farm fresh bananas packed with natural sweetness and potassium.",
    ingredients: "Banana",
    image: "https://picsum.photos/id/292/400/400",
  },
  {
    id: "2",
    name: "Roasted Almonds",
    category: "snacks",
    price: 5.99,
    description: "Crunchy roasted almonds, lightly salted for a healthy snack break.",
    ingredients: "Almonds, sea salt.",
    image: "https://picsum.photos/id/431/400/400",
  },
  {
    id: "3",
    name: "Cold Brew Coffee",
    category: "beverages",
    price: 3.5,
    description: "Smooth and bold cold brew coffee for your instant energy boost.",
    ingredients: "Water, arabica coffee extract.",
    image: "https://picsum.photos/id/30/400/400",
  },
  {
    id: "4",
    name: "Olive Crackers",
    category: "snacks",
    price: 4.25,
    description: "Baked olive crackers made for tea-time and quick evening bites.",
    ingredients: "Wheat flour, olive oil, herbs.",
    image: "https://picsum.photos/id/1080/400/400",
  },
  {
    id: "5",
    name: "Fabric Cleaner",
    category: "household",
    price: 7.99,
    description: "Gentle liquid cleaner that removes stains while keeping fabrics soft.",
    ingredients: "Plant surfactants, cleaning agents.",
    image: "https://picsum.photos/id/312/400/400",
  },
  {
    id: "6",
    name: "Sparkling Water",
    category: "beverages",
    price: 1.99,
    description: "Refreshing sparkling water with a crisp finish and zero sugar.",
    ingredients: "Carbonated water.",
    image: "https://picsum.photos/id/225/400/400",
  },
];

export const testimonials = [
  { id: "t1", name: "Priya", quote: "I can quickly find products, compare prices, and place orders without any hassle." },
  { id: "t2", name: "Arjun", quote: "Fast checkout and clear product details make this one of the smoothest shopping experiences." },
  { id: "t3", name: "Meera", quote: "Great deals, reliable delivery updates, and easy reorders every week." },
];

export function getCategoryName(categoryId) {
  return categories.find((item) => item.id === categoryId)?.name || "All";
}

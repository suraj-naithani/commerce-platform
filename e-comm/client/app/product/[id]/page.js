"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useDispatch } from "react-redux";
import Button from "../../../components/Button";
import ProductCard from "../../../components/ProductCard";
import Spinner from "../../../components/Spinner";
import { addToCart } from "../../../redux/slices/cartSlice";
import { useGetProductByIdQuery, useGetProductsQuery } from "../../../redux/api/productApi";

export default function ProductPage() {
  const dispatch = useDispatch();
  const params = useParams();
  const id = params?.id;
  const { data: productData, isLoading, isError } = useGetProductByIdQuery(id, { skip: !id });
  const { data: allProductsResponse } = useGetProductsQuery({ page: 1, limit: 100 });
  const allProducts = useMemo(() => allProductsResponse?.data || [], [allProductsResponse]);

  const product = useMemo(() => {
    if (!productData) return null;
    return {
      ...productData,
      id: String(productData.id),
      image: productData.images?.[0] || productData.image || "/file.svg",
      description: productData.description || "Premium pet nutrition crafted for daily wellness.",
      category: productData.category || "General",
      subcategory: productData.subcategory || "General",
      availability: productData.availability || "unknown",
    };
  }, [productData]);

  const relatedProducts = useMemo(() => {
    if (!product) return [];
    return allProducts
      .filter((item) => String(item.id) !== String(product.id) && (item.category || "dog-food") === product.category)
      .slice(0, 3)
      .map((item) => ({
        ...item,
        id: String(item.id),
        image: item.images?.[0] || item.image || "/file.svg",
        description: item.description || "Premium pet nutrition crafted for daily wellness.",
      }));
  }, [allProducts, product]);

  const productImages = useMemo(() => {
    if (!productData) return [];
    const fromApi = Array.isArray(productData.images) ? productData.images : [];
    const fallback = productData.image ? [productData.image] : [];
    const uniqueImages = [...new Set([...fromApi, ...fallback].filter(Boolean))];
    return uniqueImages.slice(0, 2);
  }, [productData]);

  const [selectedImage, setSelectedImage] = useState("");
  const defaultImage = productImages[0] || product?.image || "/file.svg";
  const activeImage = productImages.includes(selectedImage) ? selectedImage : defaultImage;

  if (isLoading) {
    return <Spinner label="Loading product..." />;
  }

  if (isError || !product) {
    return <p className="text-sm text-[#b75f5f]">Unable to load this product.</p>;
  }

  const handleAddToCart = () => {
    dispatch(addToCart(product));
  };

  return (
    <div>
      <div className="grid gap-8 rounded-3xl bg-white p-8 shadow-sm lg:grid-cols-2">
        <div className="grid gap-4">
          <div className="flex h-80 items-center justify-center rounded-2xl bg-[#f3f8ee] p-4">
            <img src={activeImage} alt={product.name} className="h-full w-full object-contain" />
          </div>
          {productImages.length > 1 && (
            <div className="grid grid-cols-2 gap-3">
              {productImages.map((imageUrl) => (
                <button
                  key={imageUrl}
                  type="button"
                  onClick={() => setSelectedImage(imageUrl)}
                  className={`flex h-20 items-center justify-center rounded-xl bg-[#f5f9f1] p-2 ${activeImage === imageUrl ? "ring-2 ring-[#6f9a5f]" : ""
                    }`}
                >
                  <img src={imageUrl} alt={product.name} className="h-full w-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <h1 className="text-3xl font-semibold text-[#2f453b]">{product.name}</h1>
          <p className="mt-2 text-xl font-semibold text-[#476556]">${product.price}</p>
          {product.merchant_name && (
            <p className="mt-2 text-sm font-medium text-[#6f9a5f]">
              Sold by {product.merchant_name}
            </p>
          )}
          <p className="mt-4 text-[#6c8578]">{product.description}</p>
          <div className="mt-4 grid gap-2 rounded-xl border border-[#d9e6d3] bg-[#fbfdf9] p-4 text-sm text-[#5e766a]">
            <p>
              <span className="font-medium text-[#2f453b]">Category:</span> {product.category}
            </p>
            <p>
              <span className="font-medium text-[#2f453b]">Subcategory:</span> {product.subcategory}
            </p>
            <p>
              <span className="font-medium text-[#2f453b]">Availability:</span>{" "}
              {String(product.availability).replaceAll("_", " ")}
            </p>
          </div>
          <div className="mt-6">
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleAddToCart}>Add to cart</Button>
              <Link href={`/checkout?productId=${encodeURIComponent(product.id)}`}>
                <Button variant="secondary">Buy now</Button>
              </Link>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <details open className="rounded-xl border border-[#d9e6d3] bg-[#fbfdf9] p-4">
              <summary className="cursor-pointer font-medium text-[#2f453b]">Description</summary>
              <p className="mt-2 text-sm text-[#6c8578]">{product.description}</p>
            </details>
          </div>
        </div>
      </div>

      <section className="mt-14">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-[#2f453b]">Related products</h2>
          <Link href={`/category?category=${encodeURIComponent(product.category)}&page=1`} className="text-sm font-medium text-[#6f9a5f]">
            More in this category
          </Link>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {relatedProducts.map((item) => (
            <ProductCard key={item.id} product={item} />
          ))}
        </div>
      </section>
    </div>
  );
}

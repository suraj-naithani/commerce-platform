import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const server = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export const productApi = createApi({
  reducerPath: "productApi",
  baseQuery: fetchBaseQuery({
    baseUrl: server,
  }),
  tagTypes: ["Product"],
  endpoints: (builder) => ({
    getProducts: builder.query({
      query: ({ page = 1, limit = 6, category = "", minPrice = "", maxPrice = "", sort = "" } = {}) => {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
        });

        if (category) params.set("category", category);
        if (minPrice !== "") params.set("minPrice", String(minPrice));
        if (maxPrice !== "") params.set("maxPrice", String(maxPrice));
        if (sort) params.set("sort", sort === "desc" ? "desc" : "asc");

        return `/api/products?${params.toString()}`;
      },
      providesTags: ["Product"],
    }),
    getProductCategories: builder.query({
      query: () => "/api/products/categories",
      providesTags: ["Product"],
    }),
    getProductById: builder.query({
      query: (id) => `/api/products/${id}`,
      providesTags: (result, error, id) => [{ type: "Product", id }],
    }),
  }),
});

export const { useGetProductsQuery, useGetProductCategoriesQuery, useGetProductByIdQuery } = productApi;

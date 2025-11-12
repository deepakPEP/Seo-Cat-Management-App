"use client";

import { useState, useEffect } from "react";
import axiosInstance from "@/lib/axiosInstance";
import { useRouter } from "next/navigation";

const FiltersPage = () => {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const router = useRouter();

  useEffect(() => {
    axiosInstance.get("/categories").then((res) => setCategories(res.data));
  }, []);

  const handleCategoryChange = async (id: string) => {
    setSelectedCategory(id);
    const res = await axiosInstance.get(`/subcategories/by-category/${id}`);
    setSubcategories(res.data);
  };

  const handleApply = () => {
    router.push(`/products?category=${selectedCategory}&subcategory=${selectedSubcategory}`);
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Filter Products</h1>

      {/* Category Select */}
      <select
        value={selectedCategory}
        onChange={(e) => handleCategoryChange(e.target.value)}
        className="border p-2 mb-4"
      >
        <option value="">Select Category</option>
        {categories.map((cat: any) => (
          <option key={cat._id} value={cat._id}>
            {cat.main_cat_name}
          </option>
        ))}
      </select>

      {/* Subcategory Select */}
      <select
        value={selectedSubcategory}
        onChange={(e) => setSelectedSubcategory(e.target.value)}
        className="border p-2 mb-4"
      >
        <option value="">Select Subcategory</option>
        {subcategories.map((sub: any) => (
          <option key={sub._id} value={sub._id}>
            {sub.sub_cat_name}
          </option>
        ))}
      </select>

      <button
        className="px-4 py-2 bg-green-600 text-white rounded"
        onClick={handleApply}
      >
        Apply
      </button>
    </div>
  );
};

export default FiltersPage;

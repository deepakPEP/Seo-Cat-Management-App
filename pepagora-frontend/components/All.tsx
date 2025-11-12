'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';

export default function CategoryHeaderPage() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [banner, setBanner] = useState<File | null>(null);
  const [headerTitle, setHeaderTitle] = useState('');
  const [headerContent, setHeaderContent] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaKeywords, setMetaKeywords] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [message, setMessage] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  // Fetch categories on load
  useEffect(() => {
    axios
      .get('http://localhost:4000/categories', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setCategories(res.data))
      .catch((err) => console.error('Failed to load categories:', err));
  }, []);

  // Fetch header info when a category is selected
  useEffect(() => {
    if (!selectedCategory) {
      setHeaderTitle('');
      setHeaderContent('');
      setMetaTitle('');
      setMetaKeywords('');
      setMetaDescription('');
      return;
    }

    axios
      .get(`http://localhost:4000/categories/${selectedCategory}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const data = res.data;
        setHeaderTitle(data.metaTitle || '');
        setHeaderContent(data.headerContent || '');
        setMetaTitle(data.metaTitle || '');
        setMetaKeywords(data.metaKeyword || '');
        setMetaDescription(data.metaDescription || '');
      })
      .catch(() => {
        // Clear fields if no data found
        setHeaderTitle('');
        setHeaderContent('');
        setMetaTitle('');
        setMetaKeywords('');
        setMetaDescription('');
      });
  }, [selectedCategory]);

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('categoryId', selectedCategory);
    if (banner) formData.append('banner', banner);
    formData.append('headerTitle', headerTitle);
    formData.append('headerContent', headerContent);
    formData.append('metaTitle', metaTitle);
    formData.append('metaKeyword', metaKeywords);
    formData.append('metaDescription', metaDescription);

    try {
      await axios.post('http://localhost:4000/category-header', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      setMessage('Header saved successfully!');
    } catch (err) {
      setMessage('Failed to save header');
      console.error(err);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white shadow-lg rounded-md mt-10">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Category Pages Header</h1>

      {message && (
        <div className="mb-4 text-sm text-red-600 border border-red-300 p-2 rounded">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block font-medium mb-1">Select Main Category</label>
          <select
            className="w-full p-2 border border-gray-300 rounded"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            required
          >
            <option value="">-- Choose a Category --</option>
            {categories.map((cat: any) => (
              <option key={cat._id} value={cat._id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-medium mb-1">Upload Banner</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setBanner(e.target.files?.[0] || null)}
            className="block w-full text-sm border rounded p-2"
          />
        </div>

        <div>
          <input
            type="text"
            placeholder="Header Title"
            value={headerTitle}
            onChange={(e) => setHeaderTitle(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>

        <div>
          <textarea
            placeholder="Header Content"
            value={headerContent}
            onChange={(e) => setHeaderContent(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            rows={3}
          />
        </div>

        <div>
          <input
            type="text"
            placeholder="Meta Title"
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>

        <div>
          <textarea
            placeholder="Meta Keywords"
            value={metaKeywords}
            onChange={(e) => setMetaKeywords(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            rows={2}
          />
        </div>

        <div>
          <textarea
            placeholder="Meta Description"
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            rows={3}
          />
        </div>

        <div className="pt-4">
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded shadow"
          >
            Add Banner
          </button>
        </div>
      </form>
    </div>
  );
}

"use client";

export default function Loader() {
  return (
    <div className="flex items-center justify-center h-full w-full py-20">
      <div className="relative flex items-center justify-center">
        {/* Outer ring */}
        <div className="w-12 h-12 border-4 border-gray-200 rounded-full animate-spin border-t-blue-600"></div>

        {/* Inner dot */}
        <div className="absolute w-4 h-4 bg-blue-600 rounded-full animate-ping"></div>
      </div>
    </div>
  );
}

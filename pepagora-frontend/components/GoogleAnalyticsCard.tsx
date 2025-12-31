"use client";

import { useState, useEffect } from "react";
import axiosInstance from "@/lib/axiosInstance";

type GoogleAnalyticsCardProps = {
  pageUrl: string;
  pageType: "category" | "subcategory" | "productcategory";
};

type DateRangeOption = "previous_week" | "previous_month" | "previous_year" | "custom";

export default function GoogleAnalyticsCard({ pageUrl, pageType }: GoogleAnalyticsCardProps) {
  const [pageViews, setPageViews] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<DateRangeOption>("previous_month");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Fetch analytics on component mount with default date range
  useEffect(() => {
    if (pageUrl) {
      fetchAnalytics("previous_month", undefined, undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageUrl]);

  const fetchAnalytics = async (
    range: DateRangeOption,
    startDate?: string,
    endDate?: string
  ) => {
    if (!pageUrl) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.post("/marketing/analytics", {
        pageUrl,
        dateRange: range,
        customStartDate: startDate,
        customEndDate: endDate,
      });

      // Extract pageViews from response
      // Response structure: { data: { statusCode, message, data: { pageViews, ... } } }
      let views: number | undefined;
      
      // Direct access - most reliable
      if (response?.data?.data?.pageViews !== undefined) {
        views = response.data.data.pageViews;
      } 
      // Fallback: check if data is at root level
      else if (response?.data?.pageViews !== undefined) {
        views = response.data.pageViews;
      }
      // Last resort: try to find it anywhere in the response
      else {
        const searchForPageViews = (obj: any): number | undefined => {
          if (!obj || typeof obj !== 'object') return undefined;
          if ('pageViews' in obj && obj.pageViews !== undefined) return obj.pageViews;
          for (const key in obj) {
            const result = searchForPageViews(obj[key]);
            if (result !== undefined) return result;
          }
          return undefined;
        };
        views = searchForPageViews(response?.data);
      }
      
      // Ensure pageViews is a number
      if (views !== undefined && views !== null) {
        const pageViewsNumber = typeof views === 'number' ? views : parseInt(String(views), 10);
        if (!isNaN(pageViewsNumber)) {
          setPageViews(pageViewsNumber);
          setError(null); // Clear any previous errors
        } else {
          setError("Invalid page views data");
          setPageViews(0);
        }
      } else {
        setError("Failed to fetch analytics data - invalid response");
        setPageViews(0);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || "Failed to fetch analytics";
      setError(errorMessage);
      setPageViews(0);
    } finally {
      setLoading(false);
    }
  };

  const handleGetAnalytics = () => {
    if (dateRange === "custom") {
      if (!customStartDate || !customEndDate) {
        setError("Please select both start and end dates");
        return;
      }
      fetchAnalytics("custom", customStartDate, customEndDate);
    } else {
      fetchAnalytics(dateRange);
    }
  };

  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return (
    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl border border-orange-200/60 p-6 shadow-lg">
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 bg-orange-500 rounded-xl">
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-orange-700">Google Analytics</p>
          {loading ? (
            <div className="flex items-center gap-2 mt-1">
              <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-orange-600">Loading...</p>
            </div>
          ) : pageViews !== null ? (
            <p className="text-2xl font-bold text-orange-900">
              {pageViews.toLocaleString()} views
            </p>
          ) : (
            <p className="text-2xl font-bold text-orange-900">-</p>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-2 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-orange-700 mb-1">
            Date Range
          </label>
          <select
            value={dateRange}
            onChange={(e) => {
              setDateRange(e.target.value as DateRangeOption);
              setError(null);
            }}
            className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-gray-900"
          >
            <option value="previous_week">Previous Week</option>
            <option value="previous_month">Previous Month (default)</option>
            <option value="previous_year">Previous Year</option>
            <option value="custom">Choose date</option>
          </select>
        </div>

        {dateRange === "custom" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-orange-700 mb-1">
                From
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                max={formatDateForInput(new Date())}
                className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-orange-700 mb-1">
                To
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                max={formatDateForInput(new Date())}
                className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-gray-900"
              />
            </div>
          </div>
        )}

        <button
          onClick={handleGetAnalytics}
          disabled={loading}
          className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-medium"
        >
          {loading ? "Fetching..." : "Get Analytics"}
        </button>
      </div>
    </div>
  );
}


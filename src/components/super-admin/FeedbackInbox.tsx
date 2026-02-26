"use client";

import { useEffect, useState } from "react";
import FeedbackCard from "./FeedbackCard";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Inbox, ChevronLeft, ChevronRight } from "lucide-react";

interface Feedback {
  _id: string;
  title: string;
  description: string;
  category: 'Bug Report' | 'Feature Request' | 'Support Question' | 'General Feedback' | 'Performance Issue';
  workspaceName: string;
  submittedByName: string;
  status: 'pending' | 'resolved';
  resolvedAt?: string;
  createdAt: string;
}

interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

type FilterType = 'all' | 'pending' | 'resolved';

export default function FeedbackInbox() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationData>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 50,
  });

  useEffect(() => {
    fetchFeedback();
  }, [filter, currentPage]);

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("authToken");
      const queryParams = new URLSearchParams({
        status: filter,
        page: currentPage.toString(),
        limit: '50',
      });

      const response = await fetch(
        `http://localhost:5000/api/feedback?${queryParams}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch feedback');
      }

      const data = await response.json();
      setFeedbacks(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      const token = localStorage.getItem("authToken");

      // Optimistic update
      setFeedbacks((prev) =>
        prev.map((f) =>
          f._id === id
            ? { ...f, status: 'resolved' as const, resolvedAt: new Date().toISOString() }
            : f
        )
      );

      const response = await fetch(
        `http://localhost:5000/api/feedback/${id}/resolve`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to resolve feedback');
      }

      // Refetch to ensure consistency
      fetchFeedback();
    } catch (err) {
      // Revert optimistic update on error
      setError(err instanceof Error ? err.message : 'Failed to resolve feedback');
      fetchFeedback();
    }
  };

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      setCurrentPage(page);
    }
  };

  // Loading skeleton
  if (loading && feedbacks.length === 0) {
    return (
      <div className="space-y-6">
        {/* Filter Tabs Skeleton */}
        <div className="flex gap-4 border-b border-gray-800 pb-2">
          <Skeleton className="h-10 w-20 bg-gray-800" />
          <Skeleton className="h-10 w-24 bg-gray-800" />
          <Skeleton className="h-10 w-24 bg-gray-800" />
        </div>

        {/* Feedback Cards Skeleton */}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[#111111] border border-gray-800 rounded-xl p-6">
              <Skeleton className="h-6 w-3/4 mb-4 bg-gray-800" />
              <Skeleton className="h-4 w-full mb-2 bg-gray-800" />
              <Skeleton className="h-4 w-full mb-4 bg-gray-800" />
              <Skeleton className="h-4 w-1/2 bg-gray-800" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error && feedbacks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-white mb-2">Failed to Load Feedback</h3>
          <p className="text-gray-400 text-sm mb-4">{error}</p>
          <button
            onClick={fetchFeedback}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Feedback Inbox</h2>
        <p className="text-gray-400 text-sm mt-1">
          Review and manage feedback from workspace administrators
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-4 border-b border-gray-800">
        <button
          onClick={() => handleFilterChange('all')}
          className={`px-4 py-3 text-sm font-medium transition-colors relative ${
            filter === 'all'
              ? 'text-purple-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          All
          {filter === 'all' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
          )}
        </button>
        <button
          onClick={() => handleFilterChange('pending')}
          className={`px-4 py-3 text-sm font-medium transition-colors relative ${
            filter === 'pending'
              ? 'text-purple-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Pending
          {filter === 'pending' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
          )}
        </button>
        <button
          onClick={() => handleFilterChange('resolved')}
          className={`px-4 py-3 text-sm font-medium transition-colors relative ${
            filter === 'resolved'
              ? 'text-purple-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Resolved
          {filter === 'resolved' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
          )}
        </button>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          {pagination.totalItems} {pagination.totalItems === 1 ? 'item' : 'items'} found
        </p>
      </div>

      {/* Feedback List */}
      {feedbacks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center">
            <Inbox className="w-10 h-10 text-gray-600" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-white mb-2">No Feedback Found</h3>
            <p className="text-gray-400 text-sm">
              {filter === 'all'
                ? 'No feedback submissions yet'
                : `No ${filter} feedback submissions`}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {feedbacks.map((feedback) => (
            <FeedbackCard
              key={feedback._id}
              feedback={feedback}
              onResolve={handleResolve}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-800">
          <p className="text-sm text-gray-400">
            Page {pagination.currentPage} of {pagination.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-2 bg-[#111111] border border-gray-800 rounded-lg text-sm font-medium text-white hover:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === pageNum
                        ? 'bg-purple-600 text-white'
                        : 'bg-[#111111] border border-gray-800 text-white hover:border-purple-500'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === pagination.totalPages}
              className="px-3 py-2 bg-[#111111] border border-gray-800 rounded-lg text-sm font-medium text-white hover:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

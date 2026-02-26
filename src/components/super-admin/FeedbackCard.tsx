"use client";

import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/timeAgo";
import { CheckCircle, Building2, User } from "lucide-react";

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

interface FeedbackCardProps {
  feedback: Feedback;
  onResolve: (id: string) => void;
}

const categoryColors: Record<Feedback['category'], string> = {
  'Bug Report': 'bg-red-500/10 text-red-500 border-red-500/20',
  'Feature Request': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'Support Question': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  'General Feedback': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  'Performance Issue': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
};

export default function FeedbackCard({ feedback, onResolve }: FeedbackCardProps) {
  const isResolved = feedback.status === 'resolved';

  return (
    <div
      className={`bg-[#111111] border border-gray-800 rounded-xl p-6 transition-all ${
        isResolved ? 'opacity-60' : 'hover:border-purple-500/50'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <h4
            className={`text-lg font-semibold text-white mb-2 ${
              isResolved ? 'line-through' : ''
            }`}
          >
            {feedback.title}
          </h4>
          <Badge
            className={`${categoryColors[feedback.category]} border`}
          >
            {feedback.category}
          </Badge>
        </div>

        {/* Resolve Button */}
        {!isResolved && (
          <button
            onClick={() => onResolve(feedback._id)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
          >
            <CheckCircle className="w-4 h-4" />
            Mark as Resolved
          </button>
        )}

        {/* Resolved Badge */}
        {isResolved && (
          <Badge className="bg-green-500/10 text-green-500 border border-green-500/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Resolved
          </Badge>
        )}
      </div>

      {/* Description */}
      <p className="text-gray-300 text-sm mb-4 whitespace-pre-wrap">
        {feedback.description}
      </p>

      {/* Metadata */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          <span>{feedback.workspaceName}</span>
        </div>
        <div className="flex items-center gap-2">
          <User className="w-4 h-4" />
          <span>{feedback.submittedByName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>•</span>
          <span>{timeAgo(feedback.createdAt)}</span>
        </div>
        {isResolved && feedback.resolvedAt && (
          <>
            <div className="flex items-center gap-2">
              <span>•</span>
              <span className="text-green-500">
                Resolved {timeAgo(feedback.resolvedAt)}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface DecisionButtonsProps {
  currentStatus: string;
  isSubmitting: boolean;
  onDecision: (decision: "accept" | "reject") => void;
}

export const DecisionButtons = ({
  currentStatus,
  isSubmitting,
  onDecision,
}: DecisionButtonsProps) => {
  const isDecided = currentStatus === "accepted" || currentStatus === "rejected";

  return (
    <div className="mt-8 border-t border-gray-200 pt-6 text-center">
      <p className="text-lg font-medium text-gray-900 mb-4">
        {isDecided
          ? `Decision: ${currentStatus === "accepted" ? "Accepted" : "Rejected"}`
          : "Should we accept this applicant?"}
      </p>

      <div className="flex justify-center gap-4">
        <button
          onClick={() => onDecision("accept")}
          disabled={isSubmitting}
          className={`px-10 py-3 text-lg font-bold rounded-lg transition-colors ${
            currentStatus === "accepted"
              ? "bg-green-600 text-white ring-2 ring-green-300"
              : "bg-green-500 text-white hover:bg-green-600"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isSubmitting ? "..." : "YES"}
        </button>

        <button
          onClick={() => onDecision("reject")}
          disabled={isSubmitting}
          className={`px-10 py-3 text-lg font-bold rounded-lg transition-colors ${
            currentStatus === "rejected"
              ? "bg-red-600 text-white ring-2 ring-red-300"
              : "bg-red-500 text-white hover:bg-red-600"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isSubmitting ? "..." : "NO"}
        </button>
      </div>

      {isDecided && (
        <p className="text-xs text-gray-400 mt-2">
          Click again to change the decision
        </p>
      )}
    </div>
  );
};

import React from "react";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle, AlertCircle, Clock } from "lucide-react";

export type ProcessingStatus = "idle" | "processing" | "success" | "error";

interface ProcessingItem {
  id: string;
  name: string;
  status: ProcessingStatus;
  progress: number;
  errorMessage?: string;
}

interface AIProcessingStatusProps {
  items: ProcessingItem[];
  title?: string;
  description?: string;
}

const AIProcessingStatus: React.FC<AIProcessingStatusProps> = ({
  items,
  title = "AI Processing Status",
  description = "Status of AI adaptations for selected students",
}) => {
  const getStatusIcon = (status: ProcessingStatus) => {
    switch (status) {
      case "idle":
        return <Clock className="h-5 w-5 text-muted-foreground" />;
      case "processing":
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: ProcessingStatus) => {
    switch (status) {
      case "idle":
        return "Waiting";
      case "processing":
        return "Processing";
      case "success":
        return "Completed";
      case "error":
        return "Failed";
      default:
        return "";
    }
  };

  return (
    <div className="w-full bg-white rounded-lg border p-4">
      <div className="mb-4">
        <h3 className="text-lg font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <p>No processing tasks in progress.</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {getStatusIcon(item.status)}
                  <span className="font-medium">{item.name}</span>
                </div>
                <span
                  className={`text-sm ${item.status === "error" ? "text-red-500" : "text-muted-foreground"}`}
                >
                  {getStatusText(item.status)}
                </span>
              </div>

              <Progress
                value={item.progress}
                className={`h-2 ${item.status === "error" ? "bg-red-100" : ""}`}
              />

              {item.status === "error" && item.errorMessage && (
                <p className="text-sm text-red-500 mt-1">{item.errorMessage}</p>
              )}
            </div>
          ))
        )}
      </div>

      <div className="mt-4 text-xs text-muted-foreground">
        <p>
          AI processing may take a few moments depending on the complexity of
          the content and the number of adaptations requested.
        </p>
      </div>
    </div>
  );
};

export default AIProcessingStatus;

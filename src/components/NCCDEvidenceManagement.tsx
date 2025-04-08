import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  CheckCircle,
  Download,
  FileText,
} from "lucide-react";
import { ResourceAdaptation, Student } from "@/types";

interface NCCDEvidenceManagementProps {
  adaptations: ResourceAdaptation[];
  students: Student[];
  onMarkAsEvidence: (adaptationId: string, dateTaught: Date) => Promise<void>;
}

const NCCDEvidenceManagement: React.FC<NCCDEvidenceManagementProps> = ({
  adaptations,
  students,
  onMarkAsEvidence,
}) => {
  const [selectedAdaptation, setSelectedAdaptation] =
    useState<ResourceAdaptation | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const handleMarkAsEvidence = async () => {
    if (!selectedAdaptation || !selectedDate) return;

    try {
      setIsSubmitting(true);
      await onMarkAsEvidence(selectedAdaptation.id, selectedDate);
      setIsSuccess(true);

      // Reset after success
      setTimeout(() => {
        setIsSuccess(false);
        setIsDialogOpen(false);
        setSelectedAdaptation(null);
      }, 2000);
    } catch (error) {
      console.error("Error marking as evidence:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStudentName = (studentId: string): string => {
    const student = students.find((s) => s.id === studentId);
    return student ? student.fullName : "Unknown Student";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <FileText className="h-5 w-5" />
            NCCD Evidence Management
          </CardTitle>
          <CardDescription>
            Mark resource adaptations as NCCD evidence
          </CardDescription>
        </CardHeader>
        <CardContent>
          {adaptations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p>No resource adaptations available to mark as evidence.</p>
              <p className="text-sm mt-2">
                Create resources and adapt them for students first.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {adaptations.map((adaptation) => (
                <div
                  key={adaptation.id}
                  className="border rounded-lg p-4 hover:border-primary/50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-medium">
                        Adaptation for {getStudentName(adaptation.studentId)}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Created on{" "}
                        {new Date(adaptation.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {adaptation.markedAsEvidence ? (
                      <div className="flex items-center text-green-600 text-sm gap-1">
                        <CheckCircle className="h-4 w-4" />
                        <span>Marked as Evidence</span>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedAdaptation(adaptation);
                          setIsDialogOpen(true);
                        }}
                      >
                        Mark as Evidence
                      </Button>
                    )}
                  </div>
                  <div className="bg-muted/50 p-3 rounded-md text-sm">
                    <p className="font-medium mb-1">Adaptation Summary:</p>
                    <p className="text-muted-foreground">
                      {adaptation.adaptationSummary.substring(0, 150)}...
                    </p>
                  </div>
                  {adaptation.markedAsEvidence && (
                    <div className="mt-3 flex justify-end">
                      <Button variant="outline" size="sm" className="gap-1">
                        <Download className="h-4 w-4" />
                        Download PDF
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mark as Evidence Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as NCCD Evidence</DialogTitle>
            <DialogDescription>
              Select the date when this adaptation was taught to the student.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {isSuccess ? (
              <div className="bg-green-50 text-green-800 p-4 rounded-md flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Successfully marked as evidence</p>
                  <p className="text-sm">
                    The PDF has been generated and stored securely.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Taught</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? (
                          format(selectedDate, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-sm font-medium mb-1">Important Note:</p>
                  <p className="text-xs text-muted-foreground">
                    By marking this adaptation as NCCD evidence, you confirm
                    that it was used for teaching the student on the selected
                    date. A PDF will be generated and stored securely for audit
                    purposes.
                  </p>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            {!isSuccess && (
              <Button
                onClick={handleMarkAsEvidence}
                disabled={!selectedDate || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-r-transparent"></span>
                    Processing...
                  </>
                ) : (
                  "Confirm"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NCCDEvidenceManagement;

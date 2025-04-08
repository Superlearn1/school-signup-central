import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Download, Filter } from "lucide-react";
import NCCDEvidenceManagement from "@/components/NCCDEvidenceManagement";

const NCCDEvidencePage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [studentFilter, setStudentFilter] = useState<string>("");

  // Mock student data
  const students = [
    {
      id: "student-1",
      schoolId: "school-1",
      studentId: "S12345",
      fullName: "John Smith",
      disabilities: ["specific_learning_disorder"],
      createdAt: new Date().toISOString(),
    },
    {
      id: "student-2",
      schoolId: "school-1",
      studentId: "S67890",
      fullName: "Emma Johnson",
      disabilities: ["attention_deficit_hyperactivity_disorder"],
      createdAt: new Date().toISOString(),
    },
  ];

  // Mock adaptation data
  const adaptations = [
    {
      id: "1",
      resourceId: "resource-1",
      studentId: "student-1",
      adaptedContent: "This is the adapted content for student 1",
      adaptationSummary:
        "Modified vocabulary and added visual supports for a student with specific learning disorder",
      createdAt: new Date().toISOString(),
      markedAsEvidence: false,
    },
    {
      id: "2",
      resourceId: "resource-2",
      studentId: "student-2",
      adaptedContent: "This is the adapted content for student 2",
      adaptationSummary:
        "Simplified instructions and added step-by-step guide for a student with attention-deficit/hyperactivity disorder",
      createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      markedAsEvidence: true,
    },
    {
      id: "3",
      resourceId: "resource-3",
      studentId: "student-1",
      adaptedContent: "Another adaptation for student 1",
      adaptationSummary:
        "Chunked content into smaller sections and provided additional practice examples",
      createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
      markedAsEvidence: true,
    },
  ];

  // Filter adaptations based on search and student filter
  const filteredAdaptations = adaptations.filter((adaptation) => {
    const matchesSearch = adaptation.adaptationSummary
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStudent = studentFilter
      ? adaptation.studentId === studentFilter
      : true;
    return matchesSearch && matchesStudent;
  });

  const handleMarkAsEvidence = async (
    adaptationId: string,
    dateTaught: Date,
  ) => {
    console.log("Marking as evidence:", adaptationId, dateTaught);
    // In a real app, this would call an API to mark the adaptation as evidence
    await new Promise((resolve) => setTimeout(resolve, 1500));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">NCCD Evidence Management</h2>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" /> Export Evidence
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search evidence..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="w-full sm:w-[200px]">
          <Select value={studentFilter} onValueChange={setStudentFilter}>
            <SelectTrigger>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <SelectValue placeholder="Filter by student" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Students</SelectItem>
              {students.map((student) => (
                <SelectItem key={student.id} value={student.id}>
                  {student.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <NCCDEvidenceManagement
        adaptations={filteredAdaptations}
        students={students}
        onMarkAsEvidence={handleMarkAsEvidence}
      />

      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <div>
          Showing {filteredAdaptations.length} of {adaptations.length}{" "}
          adaptations
        </div>
        <div>
          {adaptations.filter((a) => a.markedAsEvidence).length} items marked as
          evidence
        </div>
      </div>
    </div>
  );
};

export default NCCDEvidencePage;

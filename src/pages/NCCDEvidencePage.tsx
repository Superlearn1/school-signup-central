
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
import { ResourceAdaptation, Student } from "@/types";

// Extended interfaces for the mock data to include UI properties
interface ExtendedResourceAdaptation extends ResourceAdaptation {
  adaptationSummary: string;
  markedAsEvidence: boolean;
}

const NCCDEvidencePage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [studentFilter, setStudentFilter] = useState<string>("");

  // Mock student data aligned with the Student interface
  const students: Student[] = [
    {
      id: "student-1",
      school_id: "school-1",
      student_id: "S12345",
      full_name: "John Smith",
      disabilities: ["specific_learning_disorder"],
      created_at: new Date().toISOString(),
      // For UI purposes
      first_name: "John",
      last_name: "Smith"
    },
    {
      id: "student-2",
      school_id: "school-1",
      student_id: "S67890",
      full_name: "Emma Johnson",
      disabilities: ["attention_deficit_hyperactivity_disorder"],
      created_at: new Date().toISOString(),
      // For UI purposes
      first_name: "Emma",
      last_name: "Johnson"
    },
  ];

  // Mock adaptation data aligned with the ResourceAdaptation interface
  const adaptations: ExtendedResourceAdaptation[] = [
    {
      id: "1",
      resource_id: "resource-1",
      student_id: "student-1",
      adapted_content: "This is the adapted content for student 1",
      adaptations_made: "Modified vocabulary and added visual supports",
      created_at: new Date().toISOString(),
      // UI-specific properties
      adaptationSummary: "Modified vocabulary and added visual supports for a student with specific learning disorder",
      markedAsEvidence: false,
      school_id: "school-1",
      created_by: "teacher-1",
    },
    {
      id: "2",
      resource_id: "resource-2",
      student_id: "student-2",
      adapted_content: "This is the adapted content for student 2",
      adaptations_made: "Simplified instructions and added step-by-step guide",
      created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      // UI-specific properties
      adaptationSummary: "Simplified instructions and added step-by-step guide for a student with attention-deficit/hyperactivity disorder",
      markedAsEvidence: true,
      school_id: "school-1",
      created_by: "teacher-1",
    },
    {
      id: "3",
      resource_id: "resource-3",
      student_id: "student-1",
      adapted_content: "Another adaptation for student 1",
      adaptations_made: "Chunked content into smaller sections",
      created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
      // UI-specific properties
      adaptationSummary: "Chunked content into smaller sections and provided additional practice examples",
      markedAsEvidence: true,
      school_id: "school-1",
      created_by: "teacher-1",
    },
  ];

  // Filter adaptations based on search and student filter
  const filteredAdaptations = adaptations.filter((adaptation) => {
    const matchesSearch = adaptation.adaptationSummary
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStudent = studentFilter
      ? adaptation.student_id === studentFilter
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
                  {student.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <NCCDEvidenceManagement
        adaptations={adaptations}
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

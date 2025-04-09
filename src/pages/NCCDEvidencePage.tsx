import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle } from "lucide-react";

// Mock type for ResourceAdaptation
interface ResourceAdaptation {
  id: string;
  resource_id: string;
  student_id: string;
  adaptations_made: string;
  adapted_content: string;
  created_at: string;
}

// First, update the ExtendedResourceAdaptation interface to include school_id
interface ExtendedResourceAdaptation extends ResourceAdaptation {
  studentId: string;
  resourceId: string;
  createdAt: string;
  adaptationSummary: string;
  markedAsEvidence: boolean;
  adaptedContent: string;
  school_id?: string; // Add this property
}

const NCCDEvidencePage: React.FC = () => {
  // Mock resource adaptations data
  const mockResourceAdaptations: ExtendedResourceAdaptation[] = [
    {
      id: "1",
      resource_id: "r1",  // Use the correct property name
      student_id: "s1",   // Use the correct property name
      studentId: "S12345", // Keep for UI usage
      resourceId: "R001", // Keep for UI usage
      adaptations_made: "Added visual supports and simplified language",
      adapted_content: "<div>Adapted content for John Smith...</div>",
      adaptedContent: "<div>Adapted content for John Smith...</div>", // Keep for UI usage
      created_at: "2023-05-20T10:30:00Z", // Use the correct property name
      createdAt: "2023-05-20T10:30:00Z", // Keep for UI usage
      adaptationSummary: "Added visual supports and simplified language", // UI specific
      markedAsEvidence: false, // UI specific
      school_id: "school_1" // Add the required property
    },
    {
      id: "2",
      resource_id: "r2",
      student_id: "s2",
      studentId: "S67890",
      resourceId: "R002",
      adaptations_made: "Provided sentence starters and graphic organizers",
      adapted_content: "<div>Adapted content for Emma Johnson...</div>",
      adaptedContent: "<div>Adapted content for Emma Johnson...</div>",
      created_at: "2023-06-15T14:45:00Z",
      createdAt: "2023-06-15T14:45:00Z",
      adaptationSummary: "Provided sentence starters and graphic organizers",
      markedAsEvidence: true,
      school_id: "school_1"
    },
    {
      id: "3",
      resource_id: "r3",
      student_id: "s3",
      studentId: "S24680",
      resourceId: "R003",
      adaptations_made: "Used simplified text and highlighted key vocabulary",
      adapted_content: "<div>Adapted content for Michael Brown...</div>",
      adaptedContent: "<div>Adapted content for Michael Brown...</div>",
      created_at: "2023-07-01T09:00:00Z",
      createdAt: "2023-07-01T09:00:00Z",
      adaptationSummary: "Used simplified text and highlighted key vocabulary",
      markedAsEvidence: false,
      school_id: "school_1"
    },
  ];

  // Function to format the date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">NCCD Evidence</h2>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student ID</TableHead>
              <TableHead>Resource ID</TableHead>
              <TableHead>Adaptations Made</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Marked as Evidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockResourceAdaptations.map((adaptation) => (
              <TableRow key={adaptation.id}>
                <TableCell className="font-medium">{adaptation.studentId}</TableCell>
                <TableCell>{adaptation.resourceId}</TableCell>
                <TableCell>{adaptation.adaptationSummary}</TableCell>
                <TableCell>{formatDate(adaptation.createdAt)}</TableCell>
                <TableCell>
                  {adaptation.markedAsEvidence ? (
                    <Badge variant="outline">
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Yes
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <XCircle className="mr-2 h-4 w-4" />
                      No
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default NCCDEvidencePage;

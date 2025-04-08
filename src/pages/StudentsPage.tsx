import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, UserPlus } from "lucide-react";
import StudentForm from "@/components/StudentForm";
import { DSM5_DISABILITIES } from "@/constants/disabilities";

const StudentsPage: React.FC = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Mock student data
  const students = [
    {
      id: "1",
      studentId: "S12345",
      fullName: "John Smith",
      disabilities: ["SLD", "ADHD"],
      createdAt: "2023-05-15T10:30:00Z",
    },
    {
      id: "2",
      studentId: "S67890",
      fullName: "Emma Johnson",
      disabilities: ["ASD"],
      createdAt: "2023-06-20T14:45:00Z",
    },
    {
      id: "3",
      studentId: "S24680",
      fullName: "Michael Brown",
      disabilities: ["DLD", "DCD"],
      createdAt: "2023-07-05T09:15:00Z",
    },
  ];

  // Filter students based on search query
  const filteredStudents = students.filter(
    (student) =>
      student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.studentId.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Get disability name from code
  const getDisabilityName = (code: string) => {
    const disability = DSM5_DISABILITIES.find((d) => d.code === code);
    return disability ? disability.name : code;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {showAddForm ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Add New Student</h2>
            <Button variant="outline" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
          </div>
          <StudentForm
            availableSeats={10}
            onSubmit={(data) => {
              console.log("Student data submitted:", data);
              setShowAddForm(false);
              // In a real app, this would add the student to the database
            }}
          />
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Students</h2>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Student
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students by name or ID..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Disabilities</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        {student.studentId}
                      </TableCell>
                      <TableCell>{student.fullName}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {student.disabilities.map((code) => (
                            <Badge key={code} variant="outline">
                              {getDisabilityName(code)}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(student.createdAt)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No students found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {filteredStudents.length} of {students.length} students
            </p>
            <div className="text-sm text-muted-foreground">
              Student Seats: {students.length} / 50
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StudentsPage;

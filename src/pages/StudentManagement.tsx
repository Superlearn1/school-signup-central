
import React, { useState, useEffect } from 'react';
import { useUser, useOrganization } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Search, User, Edit, Trash2, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Student } from '@/types';
import { fetchStudents, createStudent, updateStudent, deleteStudent } from '@/services/api';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StudentForm } from '@/components/StudentForm';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';

const StudentManagement: React.FC = () => {
  const { user } = useUser();
  const { organization } = useOrganization();
  const queryClient = useQueryClient();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  useEffect(() => {
    const fetchSchoolId = async () => {
      if (!user?.id) return;

      try {
        // First try to get from organization
        if (organization?.id) {
          const { data: orgData } = await supabase
            .from('organizations')
            .select('school_id')
            .eq('clerk_org_id', organization.id)
            .maybeSingle();

          if (orgData?.school_id) {
            setSchoolId(orgData.school_id);
            return;
          }
        }

        // Fallback to getting from claimed schools
        const { data: schoolData } = await supabase
          .from('schools')
          .select('id')
          .eq('claimed_by_user_id', user.id)
          .maybeSingle();

        if (schoolData?.id) {
          setSchoolId(schoolData.id);
        }
      } catch (error) {
        console.error('Error fetching school ID:', error);
      }
    };

    fetchSchoolId();
  }, [user, organization]);

  // Query to fetch students
  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students', schoolId],
    queryFn: () => schoolId ? fetchStudents(schoolId) : Promise.resolve([]),
    enabled: !!schoolId,
  });

  // Mutation to create a student
  const createStudentMutation = useMutation({
    mutationFn: createStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setIsFormOpen(false);
      toast({
        title: 'Success',
        description: 'Student created successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create student: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });

  // Mutation to update a student
  const updateStudentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<Student, 'id' | 'created_at'>> }) => 
      updateStudent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setIsFormOpen(false);
      setEditingStudent(null);
      toast({
        title: 'Success',
        description: 'Student updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update student: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });

  // Mutation to delete a student
  const deleteStudentMutation = useMutation({
    mutationFn: deleteStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast({
        title: 'Success',
        description: 'Student deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete student: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });

  const handleAddStudent = (studentData: Omit<Student, 'id' | 'created_at' | 'updated_at'>) => {
    if (schoolId) {
      createStudentMutation.mutate({
        ...studentData,
        school_id: schoolId,
      });
    }
  };

  const handleUpdateStudent = (studentData: Partial<Omit<Student, 'id' | 'created_at'>>) => {
    if (editingStudent) {
      updateStudentMutation.mutate({
        id: editingStudent.id,
        data: studentData,
      });
    }
  };

  const handleDeleteStudent = (studentId: string) => {
    if (confirm('Are you sure you want to delete this student?')) {
      deleteStudentMutation.mutate(studentId);
    }
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingStudent(null);
  };

  const filteredStudents = students.filter(
    (student) =>
      student.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.student_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Student Management</h1>
        <Button onClick={() => setIsFormOpen(true)} disabled={isFormOpen}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Student
        </Button>
      </div>

      <Tabs defaultValue="all" className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All Students</TabsTrigger>
          <TabsTrigger value="recent">Recently Added</TabsTrigger>
        </TabsList>
        
        <div className="flex items-center gap-2 mt-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <TabsContent value="all" className="mt-4">
          {isLoading ? (
            <div className="flex justify-center p-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredStudents.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <User className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No students found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery
                    ? "No students match your search criteria"
                    : "You haven't added any students yet"}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setIsFormOpen(true)}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add your first student
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStudents.map((student) => (
                <Card key={student.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between">
                      <CardTitle className="text-lg">
                        {student.first_name} {student.last_name}
                      </CardTitle>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEditStudent(student)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteStudent(student.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription>ID: {student.student_id}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {student.disabilities.map((disability) => (
                        <Badge key={disability} variant="outline">
                          {disability}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="recent" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStudents
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .slice(0, 6)
              .map((student) => (
                <Card key={student.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between">
                      <CardTitle className="text-lg">
                        {student.first_name} {student.last_name}
                      </CardTitle>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEditStudent(student)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteStudent(student.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription>ID: {student.student_id}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {student.disabilities.map((disability) => (
                        <Badge key={disability} variant="outline">
                          {disability}
                        </Badge>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Added: {new Date(student.created_at).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>

      {isFormOpen && (
        <StudentForm
          onSubmit={editingStudent ? handleUpdateStudent : handleAddStudent}
          onCancel={handleCloseForm}
          initialData={editingStudent || undefined}
          isEdit={!!editingStudent}
        />
      )}
    </DashboardLayout>
  );
};

export default StudentManagement;

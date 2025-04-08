import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Student } from "@/types";
import { DSM5_DISABILITIES } from "@/constants/disabilities";

interface StudentFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  initialData?: Student;
  isEdit?: boolean;
  availableSeats?: number;
}

const StudentForm: React.FC<StudentFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  isEdit = false,
  availableSeats = 0,
}) => {
  const [formData, setFormData] = useState({
    student_id: initialData?.student_id || "",
    first_name: initialData?.first_name || "",
    last_name: initialData?.last_name || "",
    disabilities: initialData?.disabilities || [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      let firstName = initialData.first_name || "";
      let lastName = initialData.last_name || "";

      if (!firstName && !lastName && initialData.full_name) {
        const nameParts = initialData.full_name.split(" ");
        firstName = nameParts[0] || "";
        lastName = nameParts.slice(1).join(" ") || "";
      }

      setFormData({
        student_id: initialData.student_id || "",
        first_name: firstName,
        last_name: lastName,
        disabilities: initialData.disabilities || [],
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleDisabilityChange = (code: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      disabilities: checked
        ? [...prev.disabilities, code]
        : prev.disabilities.filter((d) => d !== code),
    }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.student_id.trim()) {
      newErrors.student_id = "Student ID is required";
    }

    if (!formData.first_name.trim()) {
      newErrors.first_name = "First name is required";
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = "Last name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      const data = {
        ...formData,
        full_name: `${formData.first_name} ${formData.last_name}`.trim(),
      };
      onSubmit(data);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{isEdit ? "Edit Student" : "Add New Student"}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="student_id">Student ID</Label>
            <Input
              id="student_id"
              name="student_id"
              value={formData.student_id}
              onChange={handleChange}
              placeholder="Enter student ID"
              className={errors.student_id ? "border-destructive" : ""}
              disabled={isEdit}
            />
            {errors.student_id && (
              <p className="text-sm text-destructive">{errors.student_id}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="first_name">First Name</Label>
            <Input
              id="first_name"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              placeholder="Enter first name"
              className={errors.first_name ? "border-destructive" : ""}
            />
            {errors.first_name && (
              <p className="text-sm text-destructive">{errors.first_name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="last_name">Last Name</Label>
            <Input
              id="last_name"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              placeholder="Enter last name"
              className={errors.last_name ? "border-destructive" : ""}
            />
            {errors.last_name && (
              <p className="text-sm text-destructive">{errors.last_name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Disabilities (DSM-5)</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
              {DSM5_DISABILITIES.map((disability) => (
                <div
                  key={disability.code}
                  className="flex items-center space-x-2"
                >
                  <Checkbox
                    id={`disability-${disability.code}`}
                    checked={formData.disabilities.includes(disability.code)}
                    onCheckedChange={(checked) =>
                      handleDisabilityChange(
                        disability.code,
                        checked as boolean,
                      )
                    }
                  />
                  <Label
                    htmlFor={`disability-${disability.code}`}
                    className="text-sm cursor-pointer"
                  >
                    {disability.name} ({disability.code})
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {availableSeats !== undefined && (
            <div className="bg-muted/50 p-3 rounded-md">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  Available Student Seats:
                </span>
                <span
                  className={`font-medium ${availableSeats <= 0 ? "text-destructive" : "text-primary"}`}
                >
                  {availableSeats}
                </span>
              </div>
              {availableSeats <= 3 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {availableSeats <= 0
                    ? "No seats available. Please purchase more seats."
                    : `Only ${availableSeats} seat${availableSeats === 1 ? "" : "s"} remaining. Consider purchasing more.`}
                </p>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">{isEdit ? "Update" : "Add"} Student</Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default StudentForm;

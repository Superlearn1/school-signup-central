import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Wand2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ResourceGenerationFormProps {
  onGenerate: (formData: ResourceFormData) => Promise<void>;
  isLoading?: boolean;
}

export interface ResourceFormData {
  title: string;
  type: string;
  subject: string;
  yearLevel: string;
  learningObjectives: string;
}

const RESOURCE_TYPES = [
  "Lesson Plan",
  "Assessment",
  "Worksheet",
  "Activity",
  "Unit Plan",
];

const SUBJECTS = [
  "English",
  "Mathematics",
  "Science",
  "History",
  "Geography",
  "Art",
  "Music",
  "Physical Education",
  "Technology",
  "Languages",
];

const YEAR_LEVELS = [
  "Foundation",
  "Year 1",
  "Year 2",
  "Year 3",
  "Year 4",
  "Year 5",
  "Year 6",
  "Year 7",
  "Year 8",
  "Year 9",
  "Year 10",
  "Year 11",
  "Year 12",
];

const ResourceGenerationForm: React.FC<ResourceGenerationFormProps> = ({
  onGenerate,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<ResourceFormData>({
    title: "",
    type: "",
    subject: "",
    yearLevel: "",
    learningObjectives: "",
  });
  const [error, setError] = useState<string>("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.title.trim()) {
      setError("Title is required");
      return;
    }

    if (!formData.type) {
      setError("Resource type is required");
      return;
    }

    if (!formData.subject) {
      setError("Subject is required");
      return;
    }

    if (!formData.yearLevel) {
      setError("Year level is required");
      return;
    }

    if (!formData.learningObjectives.trim()) {
      setError("Learning objectives are required");
      return;
    }

    try {
      await onGenerate(formData);
    } catch (err: any) {
      setError(err.message || "Failed to generate resource");
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Resource Title</Label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter a title for your resource"
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Resource Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => handleSelectChange("type", value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Select
                value={formData.subject}
                onValueChange={(value) => handleSelectChange("subject", value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map((subject) => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="yearLevel">Year Level</Label>
              <Select
                value={formData.yearLevel}
                onValueChange={(value) =>
                  handleSelectChange("yearLevel", value)
                }
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select year level" />
                </SelectTrigger>
                <SelectContent>
                  {YEAR_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="learningObjectives">Learning Objectives</Label>
            <Textarea
              id="learningObjectives"
              name="learningObjectives"
              value={formData.learningObjectives}
              onChange={handleChange}
              placeholder="Enter the learning objectives for this resource"
              rows={4}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Describe what students should learn or be able to do after using
              this resource.
            </p>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              className="w-full md:w-auto gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-r-transparent"></span>
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Generate Resource
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ResourceGenerationForm;

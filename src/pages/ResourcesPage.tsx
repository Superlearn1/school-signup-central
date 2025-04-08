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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, FileText, Wand2, Upload } from "lucide-react";
import ResourceGenerationForm from "@/components/ResourceGenerationForm";
import AIProcessingStatus from "@/components/AIProcessingStatus";

const ResourcesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState("resources");
  const [searchQuery, setSearchQuery] = useState("");
  const [showGenerationForm, setShowGenerationForm] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Mock resource data
  const resources = [
    {
      id: "1",
      title: "Fractions Introduction",
      type: "Lesson Plan",
      subject: "Mathematics",
      yearLevel: "Year 5",
      adaptations: 3,
      createdAt: "2023-08-10T11:30:00Z",
    },
    {
      id: "2",
      title: "Australian History Quiz",
      type: "Assessment",
      subject: "History",
      yearLevel: "Year 8",
      adaptations: 2,
      createdAt: "2023-08-15T09:45:00Z",
    },
    {
      id: "3",
      title: "Solar System Activity",
      type: "Worksheet",
      subject: "Science",
      yearLevel: "Year 4",
      adaptations: 5,
      createdAt: "2023-08-20T14:15:00Z",
    },
  ];

  // Filter resources based on search query
  const filteredResources = resources.filter(
    (resource) =>
      resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.subject.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Mock processing items for AI status
  const processingItems = [
    {
      id: "1",
      name: "Adaptation for John Smith",
      status: "success" as const,
      progress: 100,
    },
    {
      id: "2",
      name: "Adaptation for Emma Johnson",
      status: "processing" as const,
      progress: 65,
    },
  ];

  const handleGenerateResource = async (formData: any) => {
    setIsGenerating(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsGenerating(false);
    setShowGenerationForm(false);
    // In a real app, this would create the resource in the database
    console.log("Resource generated:", formData);
  };

  return (
    <div className="space-y-6">
      <Tabs
        defaultValue="resources"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="adaptations">Adaptations</TabsTrigger>
          </TabsList>

          {activeTab === "resources" && !showGenerationForm && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => console.log("Upload clicked")}
              >
                <Upload className="mr-2 h-4 w-4" /> Upload
              </Button>
              <Button onClick={() => setShowGenerationForm(true)}>
                <Wand2 className="mr-2 h-4 w-4" /> Generate New
              </Button>
            </div>
          )}
        </div>

        <TabsContent value="resources" className="space-y-4">
          {showGenerationForm ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Generate New Resource</h2>
                <Button
                  variant="outline"
                  onClick={() => setShowGenerationForm(false)}
                >
                  Cancel
                </Button>
              </div>
              <ResourceGenerationForm
                onGenerate={handleGenerateResource}
                isLoading={isGenerating}
              />
            </div>
          ) : (
            <>
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search resources..."
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
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Year Level</TableHead>
                      <TableHead>Adaptations</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResources.length > 0 ? (
                      filteredResources.map((resource) => (
                        <TableRow key={resource.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              {resource.title}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{resource.type}</Badge>
                          </TableCell>
                          <TableCell>{resource.subject}</TableCell>
                          <TableCell>{resource.yearLevel}</TableCell>
                          <TableCell>{resource.adaptations}</TableCell>
                          <TableCell>
                            {formatDate(resource.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-24 text-center text-muted-foreground"
                        >
                          No resources found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="adaptations" className="space-y-4">
          <AIProcessingStatus
            items={processingItems}
            title="Recent Adaptations"
            description="Status of AI adaptations for students"
          />

          <div className="bg-muted/30 p-4 rounded-lg border">
            <h3 className="text-lg font-medium mb-2">
              Adaptation Instructions
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              To create adaptations for students, first select a resource from
              the Resources tab, then choose the students you want to adapt it
              for. The AI will generate personalized adaptations based on each
              student's disability profile.
            </p>
            <Button
              onClick={() => setActiveTab("resources")}
              className="w-full sm:w-auto"
            >
              Go to Resources
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ResourcesPage;

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { School } from "@/types";
import { Search, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SchoolSelectionProps {
  schools: School[];
  selectedSchoolId: string | null;
  onSchoolSelect: (schoolId: string) => void;
  error?: string;
}

const SchoolSelection: React.FC<SchoolSelectionProps> = ({
  schools,
  selectedSchoolId,
  onSchoolSelect,
  error,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredSchools, setFilteredSchools] = useState<School[]>(schools);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredSchools(schools);
    } else {
      const filtered = schools.filter((school) =>
        school.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      setFilteredSchools(filtered);
    }
  }, [searchQuery, schools]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="schoolSearch">Search for a school</Label>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="schoolSearch"
            placeholder="Search schools..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="school">School</Label>
        <Select
          onValueChange={onSchoolSelect}
          value={selectedSchoolId || undefined}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a school" />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            <SelectGroup>
              <SelectLabel>Schools</SelectLabel>
              {filteredSchools.length > 0 ? (
                filteredSchools.map((school) => (
                  <SelectItem
                    key={school.id}
                    value={school.id}
                    disabled={school.claimed}
                  >
                    {school.name} {school.claimed && "(Already claimed)"}
                  </SelectItem>
                ))
              ) : (
                <div className="p-2 text-center text-muted-foreground">
                  No schools found
                </div>
              )}
            </SelectGroup>
          </SelectContent>
        </Select>
        {error && <p className="text-destructive text-sm">{error}</p>}
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          You'll become the administrator for this school. This action cannot be
          undone.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default SchoolSelection;


import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  CreditCard,
  Plus,
  Minus,
  ExternalLink,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Subscription } from "@/types";

// Add UI-specific properties not in the database model
interface ExtendedSubscription extends Subscription {
  currentPeriodEnd?: string;
}

interface SubscriptionManagementProps {
  subscription: ExtendedSubscription;
  onUpdateSeats: (teacherSeats: number, studentSeats: number) => Promise<void>;
  onOpenCustomerPortal: () => Promise<void>;
}

const SubscriptionManagement: React.FC<SubscriptionManagementProps> = ({
  subscription,
  onUpdateSeats,
  onOpenCustomerPortal,
}) => {
  const [teacherSeats, setTeacherSeats] = useState<number>(
    subscription.total_teacher_seats,
  );
  const [studentSeats, setStudentSeats] = useState<number>(
    subscription.total_student_seats,
  );
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const handleTeacherSeatsChange = (value: number) => {
    // Ensure at least 1 teacher seat
    setTeacherSeats(Math.max(1, value));
  };

  const handleStudentSeatsChange = (value: number) => {
    // Allow 0 or more student seats
    setStudentSeats(Math.max(0, value));
  };

  const handleUpdateSeats = async () => {
    if (
      teacherSeats === subscription.total_teacher_seats &&
      studentSeats === subscription.total_student_seats
    ) {
      return; // No changes
    }

    try {
      setIsUpdating(true);
      setError("");

      // Call the update seats function provided by the parent component
      await onUpdateSeats(teacherSeats, studentSeats);
    } catch (err: any) {
      setError(err.message || "Failed to update subscription");
      // Reset to original values on error
      setTeacherSeats(subscription.total_teacher_seats);
      setStudentSeats(subscription.total_student_seats);
    } finally {
      setIsUpdating(false);
    }
  };

  // Calculate price changes
  const teacherSeatDiff = teacherSeats - subscription.total_teacher_seats;
  const studentSeatDiff = studentSeats - subscription.total_student_seats;
  const pricePerSeat = 2; // $2 AUD per seat
  const additionalMonthlyCost =
    (teacherSeatDiff + studentSeatDiff) * pricePerSeat;

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-AU", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription Management
          </CardTitle>
          <CardDescription>
            Manage your school's subscription and seats
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Subscription Status:</span>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  subscription.status === "active"
                    ? "bg-green-100 text-green-800"
                    : subscription.status === "past_due"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-red-100 text-red-800"
                }`}
              >
                {subscription.status.charAt(0).toUpperCase() +
                  subscription.status.slice(1).replace("_", " ")}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span>Current Period Ends:</span>
              <span>{formatDate(subscription.currentPeriodEnd)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-medium">Teacher Seats</h3>
              <div className="flex items-center">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleTeacherSeatsChange(teacherSeats - 1)}
                  disabled={teacherSeats <= 1 || isUpdating}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  min="1"
                  value={teacherSeats}
                  onChange={(e) =>
                    handleTeacherSeatsChange(parseInt(e.target.value) || 1)
                  }
                  className="mx-2 text-center"
                  disabled={isUpdating}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleTeacherSeatsChange(teacherSeats + 1)}
                  disabled={isUpdating}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>
                  Used: {subscription.used_teacher_seats} /{" "}
                  {subscription.total_teacher_seats}
                </p>
                <p>$2 AUD per teacher / month</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium">Student Seats</h3>
              <div className="flex items-center">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleStudentSeatsChange(studentSeats - 1)}
                  disabled={studentSeats <= 0 || isUpdating}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  min="0"
                  value={studentSeats}
                  onChange={(e) =>
                    handleStudentSeatsChange(parseInt(e.target.value) || 0)
                  }
                  className="mx-2 text-center"
                  disabled={isUpdating}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleStudentSeatsChange(studentSeats + 1)}
                  disabled={isUpdating}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>
                  Used: {subscription.used_student_seats} /{" "}
                  {subscription.total_student_seats}
                </p>
                <p>$2 AUD per student / month</p>
              </div>
            </div>
          </div>

          {(teacherSeatDiff !== 0 || studentSeatDiff !== 0) && (
            <div
              className={`p-4 rounded-lg ${additionalMonthlyCost > 0 ? "bg-blue-50 border border-blue-200" : "bg-amber-50 border border-amber-200"}`}
            >
              <h3 className="font-medium mb-2">
                {additionalMonthlyCost > 0
                  ? "Subscription Change Summary"
                  : "Seat Reduction Summary"}
              </h3>
              <div className="space-y-1 text-sm">
                {teacherSeatDiff !== 0 && (
                  <div className="flex justify-between">
                    <span>
                      Teacher Seats:{" "}
                      {teacherSeatDiff > 0
                        ? `+${teacherSeatDiff}`
                        : teacherSeatDiff}
                    </span>
                    <span>
                      ${(teacherSeatDiff * pricePerSeat).toFixed(2)} AUD / month
                    </span>
                  </div>
                )}
                {studentSeatDiff !== 0 && (
                  <div className="flex justify-between">
                    <span>
                      Student Seats:{" "}
                      {studentSeatDiff > 0
                        ? `+${studentSeatDiff}`
                        : studentSeatDiff}
                    </span>
                    <span>
                      ${(studentSeatDiff * pricePerSeat).toFixed(2)} AUD / month
                    </span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between font-medium">
                  <span>Total Change:</span>
                  <span
                    className={
                      additionalMonthlyCost > 0
                        ? "text-blue-700"
                        : "text-amber-700"
                    }
                  >
                    {additionalMonthlyCost > 0 ? "+" : ""}$
                    {additionalMonthlyCost.toFixed(2)} AUD / month
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button
            onClick={handleUpdateSeats}
            disabled={
              isUpdating ||
              (teacherSeats === subscription.total_teacher_seats &&
                studentSeats === subscription.total_student_seats)
            }
            className="w-full"
          >
            {isUpdating ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-r-transparent"></span>
                Updating Subscription...
              </>
            ) : (
              "Update Subscription"
            )}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Billing Management</CardTitle>
          <CardDescription>
            Manage payment methods and view invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Use the Stripe Customer Portal to manage your payment methods, view
            past invoices, and update your billing information.
          </p>
        </CardContent>
        <CardFooter>
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={onOpenCustomerPortal}
          >
            <ExternalLink className="h-4 w-4" />
            Open Customer Portal
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SubscriptionManagement;

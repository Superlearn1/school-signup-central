import React from "react";
import SubscriptionManagement from "@/components/SubscriptionManagement";

const SubscriptionPage: React.FC = () => {
  // Mock subscription data
  const subscription = {
    id: "sub_123456",
    schoolId: "school_1",
    status: "active" as const,
    teacherSeats: 5,
    studentSeats: 50,
    teacherSeatsUsed: 3,
    studentSeatsUsed: 25,
    currentPeriodEnd: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString(), // 30 days from now
  };

  const handleUpdateSeats = async (
    teacherSeats: number,
    studentSeats: number,
  ) => {
    console.log("Updating seats:", { teacherSeats, studentSeats });
    // In a real app, this would call an API to update the subscription
    await new Promise((resolve) => setTimeout(resolve, 1500));
  };

  const handleOpenCustomerPortal = async () => {
    console.log("Opening customer portal");
    // In a real app, this would redirect to Stripe Customer Portal
    alert("This would open the Stripe Customer Portal in a real application");
  };

  return (
    <div>
      <SubscriptionManagement
        subscription={subscription}
        onUpdateSeats={handleUpdateSeats}
        onOpenCustomerPortal={handleOpenCustomerPortal}
      />
    </div>
  );
};

export default SubscriptionPage;

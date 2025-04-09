
import React from "react";
import SubscriptionManagement from "@/components/SubscriptionManagement";
import { Subscription } from "@/types";

const SubscriptionPage: React.FC = () => {
  // Mock subscription data aligned with the Subscription interface
  const subscription: Subscription & { currentPeriodEnd: string } = {
    id: "sub_123456",
    school_id: "school_1",
    status: "active",
    total_teacher_seats: 5,
    total_student_seats: 50,
    used_teacher_seats: 3,
    used_student_seats: 25,
    stripe_customer_id: "cus_123456",
    stripe_subscription_id: "sub_123456",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    // UI-specific property
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

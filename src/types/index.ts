
export interface School {
  id: string;
  name: string;
  address?: string;
  claimed: boolean;
  user_id?: string | null;
  claimed_by_user_id?: string | null;
  clerk_org_id?: string | null;
  acara_id?: string | null;
  postcode?: string | null;
  state?: string | null;
  suburb?: string | null;
  created_at?: string;
}

export interface SignupFormData {
  username: string;
  email: string;
  password: string;
  schoolId: string | null;
}

export interface StepIndicatorProps {
  currentStep: number;
  steps: string[];
}

export interface Organization {
  id: string;
  school_id: string;
  admin_id: string;
  name: string;
  clerk_org_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  school_id: string;
  created_at: string;
  full_name?: string;
  role: string;
  clerk_user_id?: string;
}

export interface Subscription {
  id: string;
  school_id: string;
  status: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  total_teacher_seats: number;
  used_teacher_seats: number;
  total_student_seats: number;
  used_student_seats: number;
  created_at: string;
  updated_at: string;
}

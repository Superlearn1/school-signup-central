
export interface School {
  id: string;
  name: string;
  address?: string;
  claimed: boolean;
  user_id?: string | null;
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

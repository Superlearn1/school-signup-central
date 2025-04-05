
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  required: boolean;
}

type OnboardingState = {
  steps: OnboardingStep[];
  currentStepIndex: number;
  isComplete: boolean;
  isDismissed: boolean;
};

const DEFAULT_STEPS: OnboardingStep[] = [
  {
    id: "profile",
    title: "Complete Your Profile",
    description: "Add your name and basic information.",
    completed: false,
    required: true,
  },
  {
    id: "school-setup",
    title: "Set Up Your School",
    description: "Configure your school information.",
    completed: false,
    required: true,
  },
  {
    id: "subscription",
    title: "Choose a Subscription",
    description: "Select a plan for your school.",
    completed: false,
    required: true,
  },
  {
    id: "add-student",
    title: "Add Your First Student",
    description: "Create your first student profile.",
    completed: false,
    required: false,
  },
];

/**
 * Hook to manage user onboarding workflow
 */
export const useOnboarding = () => {
  const { user, profile } = useAuth();
  const [onboardingState, setOnboardingState] = useLocalStorage<OnboardingState>(
    `onboarding_${user?.id || "anonymous"}`,
    {
      steps: DEFAULT_STEPS,
      currentStepIndex: 0,
      isComplete: false,
      isDismissed: false,
    }
  );

  // Check if onboarding is complete
  const isOnboardingComplete = useCallback(() => {
    return onboardingState.steps
      .filter(step => step.required)
      .every(step => step.completed);
  }, [onboardingState.steps]);

  // Mark a specific step as completed
  const completeStep = useCallback((stepId: string) => {
    setOnboardingState(prev => {
      const updatedSteps = prev.steps.map(step => 
        step.id === stepId ? { ...step, completed: true } : step
      );
      
      // Find next incomplete required step
      let nextStepIndex = prev.currentStepIndex;
      const incompleteRequiredStep = updatedSteps
        .filter(step => step.required && !step.completed)
        .shift();
        
      if (incompleteRequiredStep) {
        nextStepIndex = updatedSteps.findIndex(s => s.id === incompleteRequiredStep.id);
      }
      
      return {
        ...prev,
        steps: updatedSteps,
        currentStepIndex: nextStepIndex,
        isComplete: updatedSteps.filter(s => s.required).every(s => s.completed),
      };
    });
  }, [setOnboardingState]);

  // Get the current step
  const currentStep = onboardingState.steps[onboardingState.currentStepIndex];

  // Dismiss onboarding
  const dismissOnboarding = useCallback(() => {
    setOnboardingState(prev => ({
      ...prev,
      isDismissed: true,
    }));
  }, [setOnboardingState]);

  // Reset onboarding
  const resetOnboarding = useCallback(() => {
    setOnboardingState({
      steps: DEFAULT_STEPS,
      currentStepIndex: 0,
      isComplete: false,
      isDismissed: false,
    });
  }, [setOnboardingState]);

  // Automatically progress through onboarding based on user state
  useEffect(() => {
    // Skip for anonymous or partially loaded users
    if (!user || !profile) return;

    // Set profile step as completed if we have a profile
    if (profile && !onboardingState.steps.find(s => s.id === "profile")?.completed) {
      completeStep("profile");
    }

    // Set school-setup step as completed if user belongs to a school
    if (profile && profile.school_id && !onboardingState.steps.find(s => s.id === "school-setup")?.completed) {
      completeStep("school-setup");
    }

    // Note: Other steps would need custom logic to determine completion
  }, [user, profile, onboardingState.steps, completeStep]);

  return {
    steps: onboardingState.steps,
    currentStep,
    currentStepIndex: onboardingState.currentStepIndex,
    isComplete: onboardingState.isComplete || isOnboardingComplete(),
    isDismissed: onboardingState.isDismissed,
    completeStep,
    dismissOnboarding,
    resetOnboarding,
    showOnboarding: !onboardingState.isDismissed && !onboardingState.isComplete,
  };
};

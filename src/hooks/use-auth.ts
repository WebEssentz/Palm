import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { useState } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const signInSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signUpSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type SignInData = z.infer<typeof signInSchema>;
type SignUpData = z.infer<typeof signUpSchema>;

interface UseAuthReturn {
  signInForm: UseFormReturn<SignInData>
  signUpForm: UseFormReturn<SignUpData>
  handleSignIn: (data: SignInData) => Promise<void>
  handleSignUp: (data: SignUpData) => Promise<void>
  handleSignOut: () => Promise<void>
  isLoading: boolean
}

export const useAuth = (): UseAuthReturn => {
  const { signIn, signOut } = useAuthActions()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false);

  const signInForm = useForm<SignInData>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const signUpForm = useForm<SignUpData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '' },
  });

  const handleSignIn = async (data: SignInData): Promise<void> => {
    setIsLoading(true);
    try {
      await signIn("password", {
        email: data.email,
        password: data.password,
        flow: 'signIn',
      })
      router.push("/dashboard");
    } catch (error) {
      console.error(error);
      signInForm.setError("password", { message: "Invalid email or password" });
    } finally {
      setIsLoading(false);
    }
  }

  const handleSignUp = async (data: SignUpData): Promise<void> => {
    setIsLoading(true);
    try {
      await signIn("password", {
        email: data.email,
        password: data.password,
        name: `${data.firstName} ${data.lastName}`,
        flow: 'signUp',
      })
      router.push("/dashboard");
    } catch (error) {
      console.error(error);
      signUpForm.setError("root", { message: "Email already exists" });
    } finally {
      setIsLoading(false);
    }
  }

  const handleSignOut = async (): Promise<void> => {
    try {
      await signOut();
      router.push("/auth/sign-in");
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setIsLoading(false);
    }
  }

  return {
    signInForm,
    signUpForm,
    handleSignIn,
    handleSignUp,
    handleSignOut,
    isLoading,
  }
}
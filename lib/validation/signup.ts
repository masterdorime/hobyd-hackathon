export type SignupField = "name" | "email" | "password" | "confirmation" | null;

export function validateSignup(input: {
  name: string;
  email: string;
  password: string;
  confirmation: string;
}): SignupField {
  if (input.name.trim().length < 1 || input.name.trim().length > 60) return "name";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) return "email";
  if (input.password.length < 8 || input.password.length > 72) return "password";
  if (input.confirmation !== input.password) return "confirmation";
  return null;
}

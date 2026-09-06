export function areSignInFieldsFilled(email: string, password: string): boolean {
  return email.trim().length > 0 && password.length > 0;
}

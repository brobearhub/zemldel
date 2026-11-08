/** Signin and signup retain their original appearance at the user's request. */
export function preservesAuthAppearance(pathname: string | null): boolean {
  return pathname === "/signin" || pathname === "/signup";
}

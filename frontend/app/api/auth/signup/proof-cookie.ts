export const SIGNUP_PROOF_COOKIE = "signup-proof";

export const signupProofCookieOptions = {
  path: "/api/auth/signup",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
} as const;

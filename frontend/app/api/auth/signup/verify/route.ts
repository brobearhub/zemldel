import { handleEmailStep } from "../email-step";

export function POST(request: Request) {
  return handleEmailStep(request, "/auth/signup/verify");
}

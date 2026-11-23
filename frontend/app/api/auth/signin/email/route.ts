import { handleEmailStep } from "../../signup/email-step";

export function POST(request: Request) {
  return handleEmailStep(request, "/auth/signin/email");
}

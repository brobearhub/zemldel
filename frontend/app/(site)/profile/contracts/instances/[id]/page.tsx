import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CustomerContractInstancePage({ params }: Props) {
  void params;
  redirect("/profile/requests");
}


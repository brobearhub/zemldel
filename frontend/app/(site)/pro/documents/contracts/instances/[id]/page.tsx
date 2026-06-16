import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProContractInstancePage({ params }: Props) {
  void params;
  redirect("/pro");
}


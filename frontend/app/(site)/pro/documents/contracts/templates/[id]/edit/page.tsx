import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProContractTemplateEditPage({ params }: Props) {
  void params;
  redirect("/pro");
}


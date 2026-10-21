import { PageHeader, Card } from "@/components/ui";
import { JoinCodeForm } from "@/components/client/join-form";

export const metadata = { title: "Join a circle" };

export default function JoinPage() {
  return (
    <div>
      <PageHeader back="/circles" title="Join a circle" subtitle="Circles are invite-only. Ask the admin for the 6-character code." />
      <Card><JoinCodeForm /></Card>
    </div>
  );
}

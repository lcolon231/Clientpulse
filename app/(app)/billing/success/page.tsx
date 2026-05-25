import Link from "next/link";
import { CheckCircleIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Subscription Confirmed — ClientPulse" };

export default function BillingSuccessPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="items-center gap-2">
          <CheckCircleIcon className="h-12 w-12 text-green-600" />
          <CardTitle>You&apos;re all set!</CardTitle>
          <CardDescription>
            Your subscription has been activated. Your plan limits have been
            updated and new features are available immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<Link href="/dashboard" />} nativeButton={false} className="gap-2">
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

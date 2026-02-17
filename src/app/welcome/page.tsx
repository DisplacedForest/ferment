import { redirect } from "next/navigation";
import { getSetting } from "@/lib/queries";
import { WelcomeForm } from "./WelcomeForm";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const onboardingDone = await getSetting("onboarding.complete");
  if (onboardingDone === "true") {
    redirect("/");
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center pt-8 sm:pt-16">
      <div className="w-full max-w-md">
        <div className="rounded-md border border-parchment-300/80 bg-parchment-50 p-6 sm:p-8 shadow-[0_1px_2px_rgba(46,14,29,0.04)]">
          <h1 className="font-display text-2xl text-wine-800 mb-1">
            Welcome to Ferment
          </h1>
          <p className="text-sm text-parchment-700 mb-6">
            A couple of quick preferences before you start.
          </p>
          <WelcomeForm />
        </div>
      </div>
    </div>
  );
}

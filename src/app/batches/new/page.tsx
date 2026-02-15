import Link from "next/link";
import { NewBatchForm } from "@/components/batch/NewBatchForm";

export default function NewBatchPage() {
  return (
    <div className="pt-8 sm:pt-12">
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm text-parchment-700 transition-colors hover:text-wine-600"
        >
          &larr; Dashboard
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="font-display text-2xl tracking-tight text-wine-800 sm:text-3xl">
          Start a new batch
        </h1>
        <p className="mt-1 text-parchment-700">
          Just the basics. You can add more detail later.
        </p>
      </div>

      <NewBatchForm />
    </div>
  );
}

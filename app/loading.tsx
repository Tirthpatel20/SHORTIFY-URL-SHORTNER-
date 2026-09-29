import Loading from "@/app/components/loading";

export default function RootLoading() {
  return (
    <main className="w-full max-w-4xl mx-auto py-12">
      <Loading text="Loading Page..." subtext="Connecting to ZipLink services" />
    </main>
  );
}

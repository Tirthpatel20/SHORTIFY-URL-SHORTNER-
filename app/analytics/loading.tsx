import Loading from "@/app/components/loading";

export default function AnalyticsLoading() {
  return (
    <main className="w-full max-w-5xl mx-auto py-12">
      <Loading
        text="Loading Analytics..."
        subtext="Fetching live telemetry, click stream data, and link statistics"
      />
    </main>
  );
}

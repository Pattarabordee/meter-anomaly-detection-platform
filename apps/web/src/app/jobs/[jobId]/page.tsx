import JobResultClient from "./result-client";

export default async function JobResultPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  return <JobResultClient jobId={jobId} />;
}

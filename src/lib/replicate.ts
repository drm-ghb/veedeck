export interface ReplicatePrediction {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output: unknown;
  error: string | null;
  logs: string | null;
}

function authHeader(): { Authorization: string } {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("REPLICATE_API_TOKEN is not set");
  return { Authorization: `Token ${token}` };
}

export async function startPrediction(
  model: string,
  input: Record<string, unknown>
): Promise<{ id: string }> {
  const [owner, name] = model.split("/");
  const res = await fetch(
    `https://api.replicate.com/v1/models/${owner}/${name}/predictions`,
    {
      method: "POST",
      headers: { ...authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ input }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Replicate error: ${text}`);
  }
  return res.json();
}

export async function getPrediction(id: string): Promise<ReplicatePrediction> {
  const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
    headers: authHeader(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Replicate error: ${text}`);
  }
  return res.json();
}

export function toInternalStatus(
  status: ReplicatePrediction["status"]
): "PENDING" | "SUCCEEDED" | "FAILED" {
  if (status === "succeeded") return "SUCCEEDED";
  if (status === "failed" || status === "canceled") return "FAILED";
  return "PENDING";
}

export function parseProgress(logs: string | null): number {
  if (!logs) return 0;
  const matches = logs.match(/(\d+)%/g);
  if (!matches || matches.length === 0) return 0;
  return parseInt(matches[matches.length - 1], 10);
}

const DEFAULT_API_NAMES = [
  "/predict",
  "/batch_predict",
  "/run_prediction",
  "/predict_batch",
];

export type HuggingFaceSpaceConfig = {
  apiName: string;
  spaceId: string;
  token: string;
  useAuth: boolean;
};

export async function callHuggingFaceSpace(
  fileBuffer: Buffer,
  fileName: string,
  config: HuggingFaceSpaceConfig,
) {
  const { Client, handle_file } = await import("@gradio/client");
  const client = await Client.connect(
    config.spaceId,
    config.useAuth && config.token
      ? ({ token: config.token as `hf_${string}` })
      : undefined,
  );

  const apiNames = config.apiName
    ? [config.apiName]
    : DEFAULT_API_NAMES;

  const fileReference = handle_file(
    new File([fileBuffer], fileName, { type: "text/csv" }),
  );

  let lastError: unknown = null;

  for (const apiName of apiNames) {
    try {
      const response = await client.predict(apiName, [fileReference]);
      return {
        response,
        apiName,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Hugging Face Space inference failed.");
}

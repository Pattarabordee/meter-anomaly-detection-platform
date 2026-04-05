export type JobSummary = {
  rows_total: number;
  predicted_abnormal: number;
  high_risk: number;
  medium_risk: number;
  low_risk: number;
};

export type PredictionItem = {
  meter_id: string;
  prediction: string;
  model_score: number;
  risk_level: string;
  top_reasons: string[];
};

export type JobResult = {
  job_id: string;
  backend?: string;
  backend_event_id?: string;
  backend_api_name?: string;
  summary: JobSummary;
  items: PredictionItem[];
};

export type CreateJobResponse = {
  job_id: string;
  status: "SUCCEEDED";
  message: string;
  warnings: string[];
  result: JobResult;
  download_csv_base64: string;
  download_file_name: string;
};

export type RuntimeInfo = {
  inference_backend: string;
  hf_space_id: string;
  hf_api_name: string;
  mock_enabled: boolean;
  public_safe: boolean;
};

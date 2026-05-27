import { extractJobFromPage } from "./extractors";
import type { ExtractedJob, MessageType, MessageResponse } from "../shared/types";

const win = window as unknown as { __skillMapContentLoaded?: boolean };

if (!win.__skillMapContentLoaded) {
  win.__skillMapContentLoaded = true;

  chrome.runtime.onMessage.addListener(
    (message: MessageType, _sender, sendResponse: (r: MessageResponse) => void) => {
      if (message.type === "PING") {
        sendResponse({ ok: true, data: { ready: true } });
        return true;
      }
      if (message.type === "GET_EXTRACTED_JOB" || message.type === "RE_EXTRACT") {
        try {
          const job: ExtractedJob | null = extractJobFromPage();
          sendResponse({
            ok: true,
            data: job,
            error: job
              ? undefined
              : "No job detected on this page. Open a job posting URL.",
          });
        } catch (err) {
          sendResponse({
            ok: false,
            error: err instanceof Error ? err.message : "Extraction failed.",
          });
        }
        return true;
      }
      return false;
    }
  );
}

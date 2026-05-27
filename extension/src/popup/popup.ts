import { sendRuntimeMessage } from "../shared/messaging";
import type { ExtractedJob, MessageResponse } from "../shared/types";

const authLabel = document.getElementById("auth-label")!;
const stateEmpty = document.getElementById("state-empty")!;
const emptyDetail = document.getElementById("empty-detail")!;
const stateLogin = document.getElementById("state-login")!;
const formJob = document.getElementById("form-job") as HTMLFormElement;
const statusEl = document.getElementById("status")!;

let currentJob: ExtractedJob | null = null;

function show(el: HTMLElement) {
  stateEmpty.classList.add("hidden");
  stateLogin.classList.add("hidden");
  formJob.classList.add("hidden");
  el.classList.remove("hidden");
}

function setEmptyHint(message: string) {
  emptyDetail.textContent = message;
}

function setStatus(text: string, ok: boolean) {
  statusEl.textContent = text;
  statusEl.className = `status ${ok ? "ok" : "err"}`;
  statusEl.classList.remove("hidden");
}

function fillForm(job: ExtractedJob) {
  (document.getElementById("title") as HTMLInputElement).value = job.title;
  (document.getElementById("company") as HTMLInputElement).value = job.company;
  (document.getElementById("location") as HTMLInputElement).value = job.location;
  (document.getElementById("category") as HTMLSelectElement).value = job.category;
  (document.getElementById("job_type") as HTMLSelectElement).value = job.job_type;
  (document.getElementById("url") as HTMLInputElement).value = job.url;
  (document.getElementById("description") as HTMLTextAreaElement).value =
    job.description;

  const badge = document.getElementById("extractor-badge")!;
  badge.textContent = job.source;
  const conf = document.getElementById("confidence-badge")!;
  conf.textContent = `${Math.round(job.confidence * 100)}% match`;
}

function readForm(): ExtractedJob {
  return {
    title: (document.getElementById("title") as HTMLInputElement).value.trim(),
    company: (document.getElementById("company") as HTMLInputElement).value.trim(),
    location: (document.getElementById("location") as HTMLInputElement).value.trim(),
    category: (document.getElementById("category") as HTMLSelectElement)
      .value as ExtractedJob["category"],
    job_type: (document.getElementById("job_type") as HTMLSelectElement)
      .value as ExtractedJob["job_type"],
    url: (document.getElementById("url") as HTMLInputElement).value.trim(),
    description: (
      document.getElementById("description") as HTMLTextAreaElement
    ).value.trim(),
    logo_url: currentJob?.logo_url ?? "",
    posted_at: currentJob?.posted_at ?? null,
    source: currentJob?.source ?? "manual",
    confidence: currentJob?.confidence ?? 1,
  };
}

async function getActiveTab(): Promise<chrome.tabs.Tab | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab ?? null;
}

function unsupportedTabReason(tab: chrome.tabs.Tab): string | null {
  const url = tab.url ?? "";
  if (!url.startsWith("http")) {
    return "This tab is not a web page. Open a job listing in Chrome first.";
  }
  if (/localhost:5173|127\.0\.0\.1:5173/.test(url)) {
    return "The SkillMap app tab is excluded. Open LinkedIn, Indeed, or a job URL in another tab.";
  }
  return null;
}

async function ensureContentScript(tabId: number): Promise<string | null> {
  try {
    const ping = (await chrome.tabs.sendMessage(tabId, {
      type: "PING",
    })) as MessageResponse<{ ready: boolean }>;
    if (ping?.ok) return null;
  } catch {
    /* not injected yet */
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["dist/content.js"],
    });
    await new Promise((r) => setTimeout(r, 300));
    return null;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/cannot access|chrome:\/\//i.test(msg)) {
      return "Cannot read this page (browser internal page).";
    }
    return "Could not connect to this tab. Refresh the job page and try again.";
  }
}

async function requestJobFromTab(): Promise<{
  job: ExtractedJob | null;
  hint: string;
}> {
  const tab = await getActiveTab();
  if (!tab?.id) {
    return { job: null, hint: "No active tab found." };
  }

  const blocked = unsupportedTabReason(tab);
  if (blocked) return { job: null, hint: blocked };

  const injectError = await ensureContentScript(tab.id);
  if (injectError) return { job: null, hint: injectError };

  try {
    const res = (await chrome.tabs.sendMessage(tab.id, {
      type: "RE_EXTRACT",
    })) as MessageResponse<ExtractedJob | null>;

    if (res?.ok && res.data?.title) {
      return { job: res.data, hint: "" };
    }

    const pageUrl = tab.url ?? "";
    if (/linkedin\.com\/jobs\/search/i.test(pageUrl)) {
      return {
        job: null,
        hint: "You're on LinkedIn job search. Click one job to open its detail page (/jobs/view/…), then detect again.",
      };
    }

    return {
      job: null,
      hint:
        res?.error ??
        "No job fields found. Wait for the page to load fully, refresh the tab, then try again.",
    };
  } catch {
    return {
      job: null,
      hint: "Refresh the job page (F5), then click Detect again. Tabs opened before installing the extension need a reload.",
    };
  }
}

async function init() {
  let auth: MessageResponse<{ email: string }>;
  try {
    auth = await sendRuntimeMessage<MessageResponse<{ email: string }>>({
      type: "GET_AUTH_STATUS",
    });
  } catch {
    authLabel.textContent = "Extension error";
    setEmptyHint(
      "Background worker not responding. On chrome://extensions click Reload on SkillMap, then try again."
    );
    show(stateEmpty);
    return;
  }

  if (!auth.ok) {
    authLabel.textContent = "Not signed in";
    show(stateLogin);
    return;
  }

  authLabel.textContent = auth.data?.email ?? "Signed in";

  const { job, hint } = await requestJobFromTab();
  if (!job?.title) {
    setEmptyHint(hint);
    show(stateEmpty);
    return;
  }

  currentJob = job;
  fillForm(job);
  show(formJob);
}

document.getElementById("options-link")?.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

document.getElementById("btn-open-options")?.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById("btn-retry")?.addEventListener("click", () => {
  void init();
});

document.getElementById("btn-refresh")?.addEventListener("click", () => {
  void init();
});

formJob.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("btn-import") as HTMLButtonElement;
  btn.disabled = true;
  statusEl.classList.add("hidden");

  const job = readForm();
  if (!job.title || !job.url.startsWith("http")) {
    setStatus("Title and a valid URL are required.", false);
    btn.disabled = false;
    return;
  }

  let res: MessageResponse<{ detail: string; skipped: boolean }>;
  try {
    res = await sendRuntimeMessage({
      type: "IMPORT_JOB",
      job,
    });
  } catch {
    setStatus("Could not reach extension background. Reload the extension.", false);
    btn.disabled = false;
    return;
  }

  if (res.ok) {
    setStatus(res.data?.detail ?? "Imported!", true);
  } else {
    setStatus(res.error ?? "Import failed.", false);
  }
  btn.disabled = false;
});

void init();

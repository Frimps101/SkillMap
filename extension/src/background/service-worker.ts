import { checkAuth, importJob, login } from "../shared/api";
import { clearTokens, saveSettings } from "../shared/storage";
import type { MessageType, MessageResponse } from "../shared/types";

chrome.runtime.onMessage.addListener(
  (message: MessageType, sender, sendResponse: (r: MessageResponse) => void) => {
    handleMessage(message, sender)
      .then(sendResponse)
      .catch((err: Error) => sendResponse({ ok: false, error: err.message }));
    return true;
  }
);

async function handleMessage(
  message: MessageType,
  sender: chrome.runtime.MessageSender
): Promise<MessageResponse> {
  if (message.type === "LOGIN") {
    const result = await login(message.email, message.password);
    if (result.ok) {
      await saveSettings({ email: message.email });
    }
    return result;
  }

  if (message.type === "LOGOUT") {
    await clearTokens();
    return { ok: true };
  }

  if (message.type === "GET_AUTH_STATUS") {
    return checkAuth();
  }

  if (message.type === "SAVE_SETTINGS") {
    await saveSettings(message.settings);
    return { ok: true };
  }

  if (message.type === "IMPORT_JOB") {
    return importJob(message.job);
  }

  return { ok: false, error: "Unknown message type." };
}

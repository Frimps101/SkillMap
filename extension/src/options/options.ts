import { DEFAULT_API_BASE_URL } from "../shared/constants";
import { sendRuntimeMessage } from "../shared/messaging";
import { getSettings } from "../shared/storage";
import type { MessageResponse } from "../shared/types";

const apiInput = document.getElementById("apiBaseUrl") as HTMLInputElement;
const emailInput = document.getElementById("email") as HTMLInputElement;
const passwordInput = document.getElementById("password") as HTMLInputElement;
const loginStatus = document.getElementById("login-status")!;

function setLoginStatus(text: string, ok: boolean) {
  loginStatus.textContent = text;
  loginStatus.className = `status ${ok ? "ok" : "err"}`;
  loginStatus.classList.remove("hidden");
}

async function load() {
  const settings = await getSettings();
  apiInput.value = settings.apiBaseUrl || DEFAULT_API_BASE_URL;
  emailInput.value = settings.email;

  try {
    const auth = await sendRuntimeMessage<MessageResponse<{ email: string }>>({
      type: "GET_AUTH_STATUS",
    });
    if (auth.ok && auth.data?.email) {
      setLoginStatus(`Signed in as ${auth.data.email}`, true);
    }
  } catch {
    setLoginStatus("Reload the extension on chrome://extensions, then try again.", false);
  }
}

document.getElementById("btn-save-api")?.addEventListener("click", async () => {
  try {
    const res = await sendRuntimeMessage<MessageResponse>({
      type: "SAVE_SETTINGS",
      settings: { apiBaseUrl: apiInput.value.trim() },
    });
    setLoginStatus(res.ok ? "API URL saved." : res.error ?? "Failed", res.ok);
  } catch {
    setLoginStatus("Extension background not available. Reload extension.", false);
  }
});

document.getElementById("btn-login")?.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) {
    setLoginStatus("Email and password required.", false);
    return;
  }

  try {
    await sendRuntimeMessage({
      type: "SAVE_SETTINGS",
      settings: { apiBaseUrl: apiInput.value.trim(), email },
    });

    const res = await sendRuntimeMessage<MessageResponse>({
      type: "LOGIN",
      email,
      password,
    });

    if (res.ok) {
      setLoginStatus(`Signed in as ${email}`, true);
      passwordInput.value = "";
    } else {
      setLoginStatus(res.error ?? "Login failed.", false);
    }
  } catch {
    setLoginStatus("Extension background not available. Reload extension.", false);
  }
});

document.getElementById("btn-logout")?.addEventListener("click", async () => {
  try {
    await sendRuntimeMessage({ type: "LOGOUT" });
    setLoginStatus("Signed out.", true);
  } catch {
    setLoginStatus("Extension background not available. Reload extension.", false);
  }
});

void load();

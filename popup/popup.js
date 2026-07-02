const DEFAULTS = {
  enabled: true,
  mode: "smart",
  brightness: 100,
  contrast: 92,
  sepia: 0,
  settingsVersion: 2,
  siteOverrides: {}
};

const elements = {
  host: document.querySelector("#host"),
  enabled: document.querySelector("#enabled"),
  siteToggle: document.querySelector("#siteToggle"),
  modeSmart: document.querySelector("#modeSmart"),
  modeInvert: document.querySelector("#modeInvert"),
  modeSoft: document.querySelector("#modeSoft"),
  brightness: document.querySelector("#brightness"),
  brightnessValue: document.querySelector("#brightnessValue"),
  contrast: document.querySelector("#contrast"),
  contrastValue: document.querySelector("#contrastValue"),
  sepia: document.querySelector("#sepia"),
  sepiaValue: document.querySelector("#sepiaValue"),
  reset: document.querySelector("#reset"),
  status: document.querySelector("#status")
};

let activeTabId = null;
let activeTabUrl = "";
let currentState = null;

function normalizeHost(host) {
  return host.replace(/^www\./, "");
}

function setStatus(text) {
  elements.status.textContent = text;
  window.clearTimeout(setStatus.timer);
  setStatus.timer = window.setTimeout(() => {
    elements.status.textContent = "";
  }, 1500);
}

function sendToTab(message) {
  return new Promise((resolve, reject) => {
    if (!activeTabId) {
      reject(new Error("No active tab"));
      return;
    }

    chrome.tabs.sendMessage(activeTabId, {
      source: "personal-dark-mode-lite",
      ...message
    }, (response) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(error);
        return;
      }

      resolve(response);
    });
  });
}

function readSettings() {
  return chrome.storage.sync.get(null).then((settings) => {
    if (!settings?.settingsVersion && settings?.mode === "invert") {
      return {
        ...DEFAULTS,
        ...settings,
        mode: "smart",
        settingsVersion: DEFAULTS.settingsVersion
      };
    }

    return {
      ...DEFAULTS,
      ...settings,
      settingsVersion: DEFAULTS.settingsVersion
    };
  });
}

function writeSettings(settings) {
  return chrome.storage.sync.set(settings);
}

function getActiveHost() {
  if (!activeTabUrl) {
    return "";
  }

  try {
    const url = new URL(activeTabUrl);
    return normalizeHost(url.hostname || "");
  } catch {
    return "";
  }
}

function canInjectIntoTab() {
  if (!activeTabUrl) {
    return false;
  }

  try {
    const url = new URL(activeTabUrl);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function injectContentScript() {
  return chrome.scripting.executeScript({
    target: {tabId: activeTabId, allFrames: true},
    files: ["src/content.js"]
  });
}

function buildState(settings) {
  const host = getActiveHost();
  const siteEnabled = settings.siteOverrides?.[host] ?? true;

  return {
    settings,
    host,
    active: Boolean(settings.enabled && siteEnabled),
    siteEnabled
  };
}

async function getStateFromTab() {
  try {
    return await sendToTab({type: "get-state"});
  } catch (error) {
    if (!canInjectIntoTab()) {
      throw error;
    }

    await injectContentScript();
    return sendToTab({type: "get-state"});
  }
}

async function getState() {
  if (canInjectIntoTab()) {
    return getStateFromTab();
  }

  return buildState(await readSettings());
}

function updateView(state) {
  currentState = state;
  const settings = state?.settings || DEFAULTS;
  const siteEnabled = state?.siteEnabled ?? true;

  elements.host.textContent = state?.host || "Open an http/https page";
  elements.enabled.checked = Boolean(settings.enabled);
  elements.siteToggle.textContent = siteEnabled ? "Disable here" : "Enable here";
  elements.siteToggle.disabled = !state?.host;
  elements.modeSmart.classList.toggle("active", settings.mode === "smart");
  elements.modeInvert.classList.toggle("active", settings.mode === "invert");
  elements.modeSoft.classList.toggle("active", settings.mode === "soft");

  elements.brightness.value = settings.brightness;
  elements.brightnessValue.textContent = `${settings.brightness}%`;
  elements.contrast.value = settings.contrast;
  elements.contrastValue.textContent = `${settings.contrast}%`;
  elements.sepia.value = settings.sepia;
  elements.sepiaValue.textContent = `${settings.sepia}%`;
}

async function patchSettings(patch) {
  const existing = currentState?.settings || await readSettings();
  const settings = {
    ...DEFAULTS,
    ...existing,
    ...patch,
    siteOverrides: {
      ...DEFAULTS.siteOverrides,
      ...(existing.siteOverrides || {}),
      ...(patch.siteOverrides || {})
    }
  };

  await writeSettings(settings);
  updateView(buildState(settings));
  setStatus("Saved");
}

function bindRange(input, output, key) {
  input.addEventListener("input", () => {
    output.textContent = `${input.value}%`;
  });

  input.addEventListener("change", () => {
    patchSettings({[key]: Number(input.value)}).catch(showError);
  });
}

function showError(error) {
  console.error(error);
  setStatus(error?.message || "Unavailable");
}

async function init() {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  activeTabId = tab?.id || null;
  activeTabUrl = tab?.url || "";

  try {
    const state = await getState();
    updateView(state);
  } catch (error) {
    updateView(buildState(await readSettings()));
    showError(error);
  }
}

elements.enabled.addEventListener("change", () => {
  patchSettings({enabled: elements.enabled.checked}).catch(showError);
});

elements.siteToggle.addEventListener("click", async () => {
  try {
    const host = currentState?.host || getActiveHost();
    if (!host) {
      setStatus("Open a website tab");
      return;
    }

    const settings = currentState?.settings || await readSettings();
    const siteEnabled = settings.siteOverrides?.[host] ?? true;
    const nextSiteOverrides = {
      ...(settings.siteOverrides || {}),
      [host]: !siteEnabled
    };

    await patchSettings({siteOverrides: nextSiteOverrides});
    setStatus(siteEnabled ? "Disabled here" : "Enabled here");
  } catch (error) {
    showError(error);
  }
});

elements.modeSmart.addEventListener("click", () => {
  patchSettings({mode: "smart", settingsVersion: DEFAULTS.settingsVersion}).catch(showError);
});

elements.modeInvert.addEventListener("click", () => {
  patchSettings({mode: "invert", settingsVersion: DEFAULTS.settingsVersion}).catch(showError);
});

elements.modeSoft.addEventListener("click", () => {
  patchSettings({mode: "soft", settingsVersion: DEFAULTS.settingsVersion}).catch(showError);
});

bindRange(elements.brightness, elements.brightnessValue, "brightness");
bindRange(elements.contrast, elements.contrastValue, "contrast");
bindRange(elements.sepia, elements.sepiaValue, "sepia");

elements.reset.addEventListener("click", () => {
  patchSettings(DEFAULTS).catch(showError);
});

init().catch(showError);

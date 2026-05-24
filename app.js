const $ = (id) => document.getElementById(id);

const PROD_SIGNATURE = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const LIVE_REGISTRY_INDEX_URL = "./public/registry-index.json";
const REGISTRY_STATUS_URL = "./public/registry-status.json";

const scenarios = {
  notes: {
    displayName: "Mint Notes",
    appId: "ai.meshkit.sample.notes",
    packageName: "ai.meshkit.sample.notes",
    publisher: "MeshKit Samples",
    capabilityId: "notes.append_note",
    description: "Append text to a user-selected note.",
    risk: "write:user_content",
    consent: "per_invocation",
    targetActivity: "ai.meshkit.sample.notes.McpInvokeActivity",
    required: ["note_ref", "text"],
    properties: { note_ref: { type: "string" }, text: { type: "string" } },
    resultRequired: ["status", "note_ref"],
    resultProperties: { status: { type: "string" }, note_ref: { type: "string" }, saved_text: { type: "string" } }
  },
  grocery: {
    displayName: "DailyMart",
    appId: "ai.meshkit.sample.dailymart",
    packageName: "ai.meshkit.sample.dailymart",
    publisher: "MeshKit Samples",
    capabilityId: "grocery.purchase_essentials",
    description: "Purchase household essentials using user-approved address and wallet permissions.",
    risk: "spend:money",
    consent: "budgeted_per_invocation",
    targetActivity: "ai.meshkit.sample.dailymart.PurchaseInvokeActivity",
    required: ["items", "max_budget_krw", "delivery_window", "payment_method"],
    properties: {
      items: { type: "array" },
      max_budget_krw: { type: "integer", minimum: 0 },
      delivery_window: { type: "string" },
      payment_method: { type: "string" }
    },
    resultRequired: ["status", "order_id", "receipt_hash"],
    resultProperties: { status: { type: "string" }, order_id: { type: "string" }, purchased_items: { type: "string" }, receipt_hash: { type: "string" } }
  }
};

let activeScenario = "notes";

function currentScenario() {
  return scenarios[activeScenario];
}

function applyScenario(name) {
  activeScenario = name;
  const scenario = scenarios[name];
  ["displayName", "appId", "packageName", "publisher", "capabilityId", "description", "risk", "consent", "targetActivity"].forEach((id) => {
    $(id).value = scenario[id];
  });
  $("signature").value = PROD_SIGNATURE;
  $("keyId").value = name === "grocery" ? "meshkit-prod-spend-2026-05" : "meshkit-prod-write-2026-05";
  document.body.dataset.scenario = name;
  renderManifest();
}

function generateManifest() {
  const scenario = currentScenario();
  const risk = $("risk").value || scenario.risk;
  const consent = $("consent").value || scenario.consent;
  return {
    ocg_version: "0.2-production-draft",
    registry_signature: {
      alg: "Ed25519",
      key_id: "ocg-registry-prod-2026-05",
      value: "registry-signature-required-before-public-listing"
    },
    app: {
      app_id: $("appId").value.trim(),
      display_name: $("displayName").value.trim(),
      platform: "android",
      package_name: $("packageName").value.trim(),
      publisher: $("publisher").value.trim(),
      verified: false
    },
    capabilities: [
      {
        id: $("capabilityId").value.trim() || scenario.capabilityId,
        version: "1.0",
        description: $("description").value.trim(),
        risk,
        consent,
        input_schema: {
          type: "object",
          required: scenario.required,
          properties: scenario.properties
        },
        result_schema: {
          type: "object",
          required: scenario.resultRequired,
          properties: scenario.resultProperties
        },
        android: {
          action: "ai.meshkit.action.INVOKE_CAPABILITY",
          target_activity: $("targetActivity").value.trim()
        },
        production_controls: {
          requires_observed_caller: true,
          requires_payload_hash: true,
          requires_fresh_timestamp: true,
          requires_replay_protection: true,
          requires_signed_receipt: true,
          max_age_seconds: 300
        }
      }
    ],
    trust: {
      package_signature_sha256: $("signature").value.trim(),
      publisher_domain: "meshkit.ai",
      verification_state: "unverified_submission",
      request_signing: {
        alg: "Ed25519",
        key_id: $("keyId").value.trim(),
        public_key_jwk_url: `https://meshkit.ai/.well-known/ocg/${$("appId").value.trim()}.jwk.json`
      }
    }
  };
}

function validateSubmissionDraft(manifest) {
  const serialized = JSON.stringify(manifest).toLowerCase();
  const forbidden = ["private_key", "secret_key", "token", "password"];
  const leaked = forbidden.find((term) => serialized.includes(term));
  if (leaked) return `blocked secret-like field: ${leaked}`;
  if (!/^[a-z0-9_.-]+$/.test(manifest.app.app_id)) return "invalid app id";
  if (!/^[a-z0-9_.-]+$/.test(manifest.app.package_name)) return "invalid package name";
  if (!/^[a-f0-9]{64}$/i.test(manifest.trust.package_signature_sha256)) return "package signature must be 64 hex chars";
  if (manifest.capabilities[0].risk === "spend:money" && manifest.capabilities[0].consent !== "budgeted_per_invocation") return "spend:money requires budgeted_per_invocation consent";
  return "valid review draft — ready to submit";
}

function buildRegistrySubmission(manifest) {
  const capability = manifest.capabilities[0];
  return {
    registry_submission: {
      schema: "ai.meshkit.ocg.registry_submission/v1",
      submission_state: "submitted_for_review",
      registry_index_url: LIVE_REGISTRY_INDEX_URL,
      registry_status_url: REGISTRY_STATUS_URL,
      created_at: new Date().toISOString()
    },
    publisher_verification: {
      publisher: manifest.app.publisher,
      publisher_domain: manifest.trust.publisher_domain,
      package_name: manifest.app.package_name,
      package_signature_sha256: manifest.trust.package_signature_sha256,
      request_signing_key_id: manifest.trust.request_signing.key_id,
      review_contact_required: true
    },
    abuse_controls: {
      secret_scan: "required_before_review",
      duplicate_app_id_check: "required_before_signing",
      high_risk_manual_review: ["spend:money", "send:external", "identity", "location"].includes(capability.risk),
      registry_signature: "issued_only_after_approval",
      revocation_ready: true,
      audit_ledger_required: true
    },
    manifest
  };
}

function renderManifest() {
  const manifest = generateManifest();
  const validation = validateSubmissionDraft(manifest);
  $("output").textContent = JSON.stringify(manifest, null, 2);
  $("statusBadge").textContent = validation;
}

function downloadManifest() {
  const blob = new Blob([JSON.stringify(generateManifest(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${$("appId").value.trim() || "app"}.ocg.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function submitForRegistryReview() {
  const manifest = generateManifest();
  const validation = validateSubmissionDraft(manifest);
  if (!validation.startsWith("valid")) {
    $("statusBadge").textContent = validation;
    return;
  }
  const submission = buildRegistrySubmission(manifest);
  $("output").textContent = JSON.stringify(submission, null, 2);
  $("statusBadge").textContent = "submitted review envelope — registry signing pending approval";
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("input, textarea, select").forEach((el) => el.addEventListener("input", renderManifest));
  $("generate").addEventListener("click", renderManifest);
  $("download").addEventListener("click", downloadManifest);
  $("submitReview").addEventListener("click", submitForRegistryReview);
  $("scenarioNotes").addEventListener("click", () => applyScenario("notes"));
  $("scenarioGrocery").addEventListener("click", () => applyScenario("grocery"));
  applyScenario("notes");
});

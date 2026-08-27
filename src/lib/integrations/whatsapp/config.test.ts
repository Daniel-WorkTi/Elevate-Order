import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { afterEach, describe, it } from "node:test";

import {
  getWhatsAppPublicConfig,
  normalizeEmbeddedSignupConfigId,
  tryGetWhatsAppPublicConfig,
} from "@/lib/integrations/whatsapp/config";

const ENV_KEYS = [
  "META_APP_ID",
  "META_APP_SECRET",
  "META_WHATSAPP_CONFIG_ID",
  "META_GRAPH_API_VERSION",
  "WHATSAPP_TOKEN_ENCRYPTION_KEY",
] as const;

function saveEnv(): Record<string, string | undefined> {
  const saved: Record<string, string | undefined> = {};
  for (const key of ENV_KEYS) saved[key] = process.env[key];
  return saved;
}

function restoreEnv(saved: Record<string, string | undefined>) {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
}

describe("WhatsApp config", () => {
  afterEach(() => {
    // restored per test
  });

  it("public config exposes only appId and configId", () => {
    const saved = saveEnv();
    process.env["META_APP_ID"] = "app123";
    process.env["META_WHATSAPP_CONFIG_ID"] = "cfg456";
    try {
      const pub = getWhatsAppPublicConfig();
      assert.deepEqual(Object.keys(pub).sort(), ["appId", "configId"]);
      assert.equal(pub.appId, "app123");
      assert.equal(pub.configId, "cfg456");
      assert.ok(!("appSecret" in pub));
      assert.ok(!("tokenEncryptionKeyBase64" in pub));
    } finally {
      restoreEnv(saved);
    }
  });

  it("strips duplicated app id prefix from embedded signup config id", () => {
    const saved = saveEnv();
    process.env["META_APP_ID"] = "1441965884450865";
    process.env["META_WHATSAPP_CONFIG_ID"] = "14419658844508651125760196680636";
    try {
      const pub = getWhatsAppPublicConfig();
      assert.equal(pub.configId, "1125760196680636");
    } finally {
      restoreEnv(saved);
    }
  });

  it("normalizeEmbeddedSignupConfigId removes angle brackets", () => {
    assert.equal(
      normalizeEmbeddedSignupConfigId("<cfg123>", "app123"),
      "cfg123",
    );
  });

  it("returns null when public env is incomplete", () => {
    const saved = saveEnv();
    delete process.env["META_APP_ID"];
    delete process.env["META_WHATSAPP_CONFIG_ID"];
    try {
      assert.equal(tryGetWhatsAppPublicConfig(), null);
    } finally {
      restoreEnv(saved);
    }
  });
});

describe("WhatsApp public config secret leak guard", () => {
  it("serialized public config never includes secrets", () => {
    const saved = saveEnv();
    process.env["META_APP_ID"] = "app123";
    process.env["META_APP_SECRET"] = "super-secret";
    process.env["META_WHATSAPP_CONFIG_ID"] = "cfg456";
    process.env["WHATSAPP_TOKEN_ENCRYPTION_KEY"] = randomBytes(32).toString("base64");
    try {
      const json = JSON.stringify(getWhatsAppPublicConfig());
      assert.ok(!json.includes("super-secret"));
      assert.ok(!json.includes("WHATSAPP_TOKEN_ENCRYPTION_KEY"));
    } finally {
      restoreEnv(saved);
    }
  });
});

import assert from "node:assert/strict";
import { test } from "node:test";

import { classifyConfirmationIntent } from "@/lib/whatsapp/inbound/classify-confirmation-intent";

const CONFIRM_CASES = [
  "sim",
  "SIM",
  "sim!",
  "confirmo",
  "Sim, confirmo.",
  "pode enviar",
  "ok pode enviar",
  "  confirmado  ",
  "yes",
  "si confirmo",
];

const REJECT_CASES = [
  "não",
  "nao",
  "não quero",
  "pode cancelar",
  "não confirmo",
  "cancelar",
  "no",
];

const NEEDS_OPERATOR_CASES = [
  "sim mas quero trocar a morada",
  "sim, mas quero dois",
  "não sei",
  "quanto demora?",
  "ok",
  "👍",
  "pode me ligar?",
  "quero alterar o pedido",
  "não, pode enviar",
  "talvez",
  "manda",
];

for (const text of CONFIRM_CASES) {
  test(`CONFIRM: ${JSON.stringify(text)}`, () => {
    const result = classifyConfirmationIntent(text);
    assert.equal(result.intent, "confirm", result.reason);
  });
}

for (const text of REJECT_CASES) {
  test(`REJECT: ${JSON.stringify(text)}`, () => {
    const result = classifyConfirmationIntent(text);
    assert.equal(result.intent, "reject", result.reason);
  });
}

for (const text of NEEDS_OPERATOR_CASES) {
  test(`NEEDS_OPERATOR: ${JSON.stringify(text)}`, () => {
    const result = classifyConfirmationIntent(text);
    assert.equal(result.intent, "needs_operator", result.reason);
  });
}

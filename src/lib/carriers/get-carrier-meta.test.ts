import assert from "node:assert/strict";
import { test } from "node:test";

import { getCarrierMeta, inferCarrierFromTrackingUrl, resolveOrderCarrier } from "@/lib/carriers/get-carrier-meta";
import { normalizeCarrierName } from "@/lib/carriers/normalize-carrier";
import { normalizeDropeaOrder } from "@/lib/integrations/dropea/normalize-dropea-order";
import { normalizeDropiOrder } from "@/lib/integrations/dropi/normalize-dropi-order";

test("normalizeCarrierName trims, lowercases, and collapses spaces", () => {
  assert.equal(normalizeCarrierName(" GLS "), "gls");
  assert.equal(normalizeCarrierName("INPOST"), "inpost");
  assert.equal(normalizeCarrierName("In Post"), "in post");
  assert.equal(normalizeCarrierName("DPD Polska"), "dpd polska");
  assert.equal(normalizeCarrierName("GLS-Spain"), "gls spain");
});

test("inferCarrierFromTrackingUrl matches known hosts", () => {
  assert.equal(inferCarrierFromTrackingUrl("https://inpost.pl/find-parcel?n=1").id, "inpost");
  assert.equal(inferCarrierFromTrackingUrl("https://www.dpd.pl/tracking").id, "dpd");
  assert.equal(inferCarrierFromTrackingUrl("https://gls-group.eu/track").id, "gls");
  assert.equal(inferCarrierFromTrackingUrl("https://www.ctt.pt/feapl_2/app/open/objectSearch").id, "ctt");
  assert.equal(inferCarrierFromTrackingUrl("https://unknown.example/track").missing, true);
});

test("resolveOrderCarrier prefers shipping_company and fills website from registry", () => {
  const named = resolveOrderCarrier({
    shipping_company: "DPD Polska",
    tracking_url: null,
  });
  assert.equal(named.id, "dpd");
  assert.equal(named.website, "https://www.dpd.com");

  const fromUrl = resolveOrderCarrier({
    shipping_company: null,
    tracking_url: "https://tracking.dpd.de/status/en_US/parcel/123",
  });
  assert.equal(fromUrl.id, "dpd");
  assert.ok(fromUrl.website);

  const pending = resolveOrderCarrier({
    shipping_company: null,
    tracking_url: null,
  });
  assert.equal(pending.missing, true);
});

test("known aliases resolve to registry display names", () => {
  assert.equal(getCarrierMeta("GLS").name, "GLS");
  assert.equal(getCarrierMeta("gls").name, "GLS");
  assert.equal(getCarrierMeta(" GLS ").name, "GLS");
  assert.equal(getCarrierMeta("InPost").name, "InPost");
  assert.equal(getCarrierMeta("IN POST").name, "InPost");
  assert.equal(getCarrierMeta("GLS Spain").id, "gls");
  assert.equal(getCarrierMeta("DPD Polska").id, "dpd");
  assert.equal(getCarrierMeta("TIPSA").id, "tipsa");
  assert.equal(getCarrierMeta("GLS").known, true);
  assert.equal(getCarrierMeta("GLS").missing, false);
  assert.ok(getCarrierMeta("GLS").logo?.startsWith("/carriers/"));
  assert.equal(getCarrierMeta("GLS").website, "https://gls-group.com");
});

test("unknown carrier preserves the raw name and is not known", () => {
  const resolved = getCarrierMeta("XYZ Logistics");
  assert.equal(resolved.name, "XYZ Logistics");
  assert.equal(resolved.known, false);
  assert.equal(resolved.missing, false);
  assert.equal(resolved.logo, undefined);
  assert.equal(resolved.id, undefined);
});

test("undefined and empty carrier are unavailable", () => {
  assert.equal(getCarrierMeta(undefined).missing, true);
  assert.equal(getCarrierMeta(null).missing, true);
  assert.equal(getCarrierMeta("").missing, true);
  assert.equal(getCarrierMeta("   ").missing, true);
});

test("country does not affect carrier resolution", () => {
  const spainGls = getCarrierMeta("GLS");
  const polandGls = getCarrierMeta("GLS");
  const spainTipsa = getCarrierMeta("TIPSA");
  assert.equal(spainGls.id, "gls");
  assert.equal(polandGls.id, "gls");
  assert.equal(spainTipsa.id, "tipsa");
  assert.notEqual(spainGls.id, spainTipsa.id);
});

test("Dropi maps shipping_company from the order payload only", () => {
  const mapped = normalizeDropiOrder({
    shipping_company: "GLS",
    tracking_code: "ES928291",
    tracking_url: "https://example.invalid/track",
    country: "ES",
  });
  assert.equal(mapped.supply, "dropi");
  assert.equal(mapped.shippingCompany, "GLS");
  assert.equal(mapped.trackingCode, "ES928291");
  assert.equal(mapped.trackingUrl, "https://example.invalid/track");
});

test("Dropi does not invent a carrier from country", () => {
  const mapped = normalizeDropiOrder({ country: "ES", postal_code: "28001" });
  assert.equal(mapped.shippingCompany, null);
});

test("Dropea maps shipping_company when present and stays null otherwise", () => {
  assert.equal(
    normalizeDropeaOrder({ shipping_company: "TIPSA", country: "ES" }).shippingCompany,
    "TIPSA",
  );
  assert.equal(normalizeDropeaOrder({ country: "ES" }).shippingCompany, null);
  assert.equal(normalizeDropeaOrder({ courier: "TIPSA" }).shippingCompany, null);
});

import type { CarrierMeta } from "@/lib/carriers/carrier-types";

/**
 * Visual recognition only. Never assigns a carrier from country or supply.
 * Incoming `shipping_company` from the order is the source of truth.
 */
export const carrierRegistry: readonly CarrierMeta[] = [
  {
    id: "gls",
    name: "GLS",
    aliases: ["gls", "gls spain", "gls españa", "gls espana", "gls poland", "gls polska", "gls portugal"],
    logo: "/carriers/gls.png",
  },
  {
    id: "tipsa",
    name: "TIPSA",
    aliases: ["tipsa"],
    logo: "/carriers/tipsa.png",
  },
  {
    id: "inpost",
    name: "InPost",
    aliases: ["inpost", "in post", "in-post"],
    logo: "/carriers/inpost.png",
  },
  {
    id: "dpd",
    name: "DPD",
    aliases: ["dpd", "dpd polska", "dpd poland", "dpd portugal", "dpd spain"],
    logo: "/carriers/dpd.png",
  },
  {
    id: "dhl",
    name: "DHL",
    aliases: ["dhl", "dhl express", "dhl parcel", "dhl polska"],
    logo: "/carriers/dhl.png",
  },
  {
    id: "ctt",
    name: "CTT",
    aliases: ["ctt", "ctt expresso", "ctt expresso portugal"],
    logo: "/carriers/ctt.png",
  },
  {
    id: "correos",
    name: "Correos",
    aliases: ["correos", "correos express"],
    logo: "/carriers/correos.png",
  },
  {
    id: "jadlog",
    name: "Jadlog",
    aliases: ["jadlog"],
    logo: "/carriers/jadlog.png",
  },
  {
    id: "orlen-paczka",
    name: "ORLEN Paczka",
    aliases: ["orlen", "orlen paczka", "orlenpaczka"],
    logo: "/carriers/orlen-paczka.svg",
  },
];

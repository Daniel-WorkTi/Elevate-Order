import type { CarrierMeta } from "@/lib/carriers/carrier-types";

/**
 * Visual recognition + official websites / tracking host hints.
 * Never assigns a carrier from country or supply — only from
 * `shipping_company` or the tracking URL host when present.
 */
export const carrierRegistry: readonly CarrierMeta[] = [
  {
    id: "gls",
    name: "GLS",
    aliases: ["gls", "gls spain", "gls españa", "gls espana", "gls poland", "gls polska", "gls portugal"],
    logo: "/carriers/gls.png",
    website: "https://gls-group.com",
    trackingHosts: [
      "gls-group.com",
      "gls-group.eu",
      "gls-spain.es",
      "gls-portugal.com",
      "gls-poland.com",
      "mygls.eu",
      "gls-pakete.de",
    ],
  },
  {
    id: "tipsa",
    name: "TIPSA",
    aliases: ["tipsa"],
    logo: "/carriers/tipsa.png",
    website: "https://www.tip-sa.com",
    trackingHosts: ["tip-sa.com", "tipsa.es", "tipsa.com"],
  },
  {
    id: "inpost",
    name: "InPost",
    aliases: ["inpost", "in post", "in-post"],
    logo: "/carriers/inpost.png",
    website: "https://inpost.pl",
    trackingHosts: ["inpost.pl", "inpost.eu", "inpost.es", "inpost.it", "inpost.uk"],
  },
  {
    id: "dpd",
    name: "DPD",
    aliases: ["dpd", "dpd polska", "dpd poland", "dpd portugal", "dpd spain"],
    logo: "/carriers/dpd.png",
    website: "https://www.dpd.com",
    trackingHosts: [
      "dpd.com",
      "dpd.pl",
      "dpd.pt",
      "dpd.es",
      "dpd.de",
      "dpd.fr",
      "dpd.co.uk",
      "tracking.dpd.de",
    ],
  },
  {
    id: "dhl",
    name: "DHL",
    aliases: ["dhl", "dhl express", "dhl parcel", "dhl polska"],
    logo: "/carriers/dhl.png",
    website: "https://www.dhl.com",
    trackingHosts: ["dhl.com", "dhl.de", "dhl.es", "dhl.pl", "dhl.pt", "dhlparcel.nl"],
  },
  {
    id: "ctt",
    name: "CTT",
    aliases: ["ctt", "ctt expresso", "ctt expresso portugal"],
    logo: "/carriers/ctt.png",
    website: "https://www.ctt.pt",
    trackingHosts: ["ctt.pt", "cttexpresso.pt"],
  },
  {
    id: "correos",
    name: "Correos",
    aliases: ["correos", "correos express"],
    logo: "/carriers/correos.png",
    website: "https://www.correos.es",
    trackingHosts: ["correos.es", "correosexpress.com"],
  },
  {
    id: "jadlog",
    name: "Jadlog",
    aliases: ["jadlog"],
    logo: "/carriers/jadlog.png",
    website: "https://www.jadlog.com.br",
    trackingHosts: ["jadlog.com.br"],
  },
  {
    id: "orlen-paczka",
    name: "ORLEN Paczka",
    aliases: ["orlen", "orlen paczka", "orlenpaczka"],
    logo: "/carriers/orlen-paczka.svg",
    website: "https://www.orlenpaczka.pl",
    trackingHosts: ["orlenpaczka.pl"],
  },
];

export type CarrierMeta = {
  id: string;
  name: string;
  aliases: string[];
  logo?: string;
  /** Official carrier website (not the parcel tracking deep-link). */
  website?: string;
  /** Hostnames that identify this carrier from a tracking URL. */
  trackingHosts?: string[];
};

export type ResolvedCarrier = {
  name: string;
  known: boolean;
  missing: boolean;
  id?: string;
  logo?: string;
  website?: string;
};

export type CarrierMeta = {
  id: string;
  name: string;
  aliases: string[];
  logo?: string;
};

export type ResolvedCarrier = {
  name: string;
  known: boolean;
  missing: boolean;
  id?: string;
  logo?: string;
};

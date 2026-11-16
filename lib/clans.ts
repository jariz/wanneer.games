export const clans = {
  kiwis: { name: "Kiwi's", emoji: "🥝", label: "De Kiwi's", home: "/", motto: "Zelfde mensen. Nieuwe avonturen.", passwordHint: "All on [...]?" },
  niglos: { name: "Niglo's", emoji: "🦔", label: "De Niglo's", home: "/niglos", motto: "Eén potje wordt nooit één potje.", passwordHint: "Nou Meester [...]?" },
} as const;

export type Clan = keyof typeof clans;

export function isClan(value: string): value is Clan {
  return Object.hasOwn(clans, value);
}

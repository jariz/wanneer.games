export const clans = {
  kiwis: { name: "Kiwi's", emoji: "🥝", label: "De Kiwi's", home: "/", passwordHint: "All on [...]?" },
  niglos: { name: "Niglo's", emoji: "🦔", label: "De Niglo's", home: "/niglos", passwordHint: "Nou Meester [...]?" },
} as const;

export type Clan = keyof typeof clans;

export function isClan(value: string): value is Clan {
  return Object.hasOwn(clans, value);
}

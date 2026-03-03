import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
} from "discord.js";
import { toZonedTime } from "date-fns-tz";
import fetchSlots from "../../../shared/fetchSlots.ts";

const TIMEZONE = "Europe/Amsterdam";

export const formatSlot = (date: Date): string => {
  const zoned = toZonedTime(date, TIMEZONE);
  return zoned.toLocaleDateString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIMEZONE,
  });
};

const buildComponents = (
  remaining: Date[],
  selected: Date[],
  originalIndices: number[],
) => {
  const confirmButton = new ButtonBuilder()
    .setCustomId("slot_confirm")
    .setLabel("Maak poll")
    .setStyle(ButtonStyle.Primary)
    .setDisabled(selected.length === 0);

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton);

  if (remaining.length === 0) return [row2];

  const select = new StringSelectMenuBuilder()
    .setCustomId("slot_select")
    .setPlaceholder("Voeg tijden toe aan de poll...")
    .setMinValues(1)
    .setMaxValues(Math.min(10, remaining.length))
    .addOptions(
      remaining.slice(0, 25).map((slot, i) => ({
        label: formatSlot(slot),
        value: String(originalIndices[i]),
      }))
    );

  const row1 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
  return [row1, row2];
};

const buildContent = (selected: Date[]) => {
  if (selected.length === 0) return "Selecteer de tijden die je in de poll wilt zetten:";
  const list = selected.map((s) => `• ${formatSlot(s)}`).join("\n");
  return `**Geselecteerd:**\n${list}\n\nVoeg meer toe of bevestig:`;
};

export const runSlotPicker = async (
  interaction: ChatInputCommandInteraction,
  group: string,
  game: string | undefined
): Promise<Date[] | null> => {
  await interaction.deferReply({ ephemeral: true });

  const slots = await fetchSlots(group);

  if (slots.length === 0) {
    await interaction.editReply({
      content: "❌ Geen beschikbare tijden gevonden in de komende 10 dagen.",
    });
    return null;
  }

  // Track which original indices are still available
  let remainingIndices = slots.slice(0, 25).map((_, i) => i);
  let remainingSlots = slots.slice(0, 25);
  let selectedSlots: Date[] = [];

  const reply = await interaction.editReply({
    content: buildContent(selectedSlots),
    components: buildComponents(remainingSlots, selectedSlots, remainingIndices),
  });

  const collector = reply.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    time: 5 * 60 * 1000,
  });

  collector.on("collect", async (selectInteraction: StringSelectMenuInteraction) => {
    const pickedOriginalIndices = selectInteraction.values.map(Number);
    const pickedSlots = pickedOriginalIndices.map((i) => slots[i]);

    selectedSlots = [...selectedSlots, ...pickedSlots];
    remainingIndices = remainingIndices.filter((i) => !pickedOriginalIndices.includes(i));
    remainingSlots = remainingIndices.map((i) => slots[i]);

    await selectInteraction.update({
      content: buildContent(selectedSlots),
      components: buildComponents(remainingSlots, selectedSlots, remainingIndices),
    });
  });

  try {
    const buttonInteraction = await reply.awaitMessageComponent({
      componentType: ComponentType.Button,
      filter: (i) => i.customId === "slot_confirm",
      time: 5 * 60 * 1000,
    });

    collector.stop();

    await buttonInteraction.update({
      content: "✅ Poll wordt aangemaakt...",
      components: [],
    });

    return selectedSlots;
  } catch {
    await interaction.editReply({
      content: "⏱️ Timeout — probeer opnieuw met /wanneer.",
      components: [],
    });
    return null;
  }
};

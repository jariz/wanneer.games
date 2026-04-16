import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
} from "discord.js";
import fetchSlots from "../../../shared/fetchSlots.ts";

const TIMEZONE = "Europe/Amsterdam";

export const formatSlot = (date: Date): string =>
  date.toLocaleDateString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIMEZONE,
  });

const formatTime = (date: Date): string =>
  date.toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIMEZONE,
  });

const formatDay = (date: Date): string =>
  date.toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: TIMEZONE,
  });

const getDayKey = (date: Date): string =>
  date.toLocaleDateString("en-CA", { timeZone: TIMEZONE }); // "YYYY-MM-DD"

const groupByDay = (slots: Date[]): Map<string, number[]> => {
  const map = new Map<string, number[]>();
  slots.forEach((slot, i) => {
    const key = getDayKey(slot);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(i);
  });
  return map;
};

const buildComponents = (
  allSlots: Date[],
  selectedIndices: number[],
  currentDayKey: string | null,
  dayGroups: Map<string, number[]>,
) => {
  const rows: ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] = [];

  // Row 1: Day picker
  const availableDays = [...dayGroups.entries()].filter(([, indices]) =>
    indices.some((i) => !selectedIndices.includes(i))
  );

  if (availableDays.length > 0) {
    const daySelect = new StringSelectMenuBuilder()
      .setCustomId("slot_day")
      .setPlaceholder("Kies een dag...")
      .addOptions(
        availableDays.map(([key, indices]) => ({
          label: formatDay(allSlots[indices[0]]),
          value: key,
          default: key === currentDayKey,
        }))
      );
    rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(daySelect));
  }

  // Row 2: Time picker for selected day
  if (currentDayKey !== null) {
    const dayIndices = dayGroups.get(currentDayKey) ?? [];
    const remainingInDay = dayIndices.filter((i) => !selectedIndices.includes(i));

    if (remainingInDay.length > 0) {
      const timeSelect = new StringSelectMenuBuilder()
        .setCustomId("slot_add")
        .setPlaceholder("Voeg tijden toe...")

        .addOptions(
          remainingInDay.map((i) => ({
            label: formatTime(allSlots[i]),
            value: String(i),
          }))
        );
      rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(timeSelect));
    }
  }

  // Row 3: Remove selected
  if (selectedIndices.length > 0) {
    const removeSelect = new StringSelectMenuBuilder()
      .setCustomId("slot_remove")
      .setPlaceholder("Verwijder een tijd...")
      .setMinValues(1)
      .setMaxValues(selectedIndices.length)
      .addOptions(
        selectedIndices.map((i) => ({
          label: formatSlot(allSlots[i]),
          value: String(i),
        }))
      );
    rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(removeSelect));
  }

  // Row 4: Confirm button
  const confirmButton = new ButtonBuilder()
    .setCustomId("slot_confirm")
    .setLabel("Maak poll")
    .setStyle(ButtonStyle.Primary)
    .setDisabled(selectedIndices.length === 0);
  rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton));

  return rows;
};

const buildContent = (selectedIndices: number[], slots: Date[]) => {
  if (selectedIndices.length === 0) return "Kies een dag en selecteer tijden voor de poll:";
  const list = selectedIndices.map((i) => `• ${formatSlot(slots[i])}`).join("\n");
  return `**Geselecteerd:**\n${list}\n\nVoeg meer toe, verwijder, of bevestig:`;
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

  const allSlots = slots;
  const dayGroups = groupByDay(allSlots);
  let selectedIndices: number[] = [];
  let currentDayKey: string | null = null;

  const reply = await interaction.editReply({
    content: buildContent(selectedIndices, allSlots),
    components: buildComponents(allSlots, selectedIndices, currentDayKey, dayGroups),
  });

  const collector = reply.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    time: 5 * 60 * 1000,
  });

  collector.on("collect", async (selectInteraction: StringSelectMenuInteraction) => {
    if (selectInteraction.customId === "slot_day") {
      currentDayKey = selectInteraction.values[0];
    } else if (selectInteraction.customId === "slot_add") {
      const values = selectInteraction.values.map(Number);
      selectedIndices = [...selectedIndices, ...values].sort((a, b) => a - b);
      currentDayKey = null;
    } else if (selectInteraction.customId === "slot_remove") {
      const values = selectInteraction.values.map(Number);
      selectedIndices = selectedIndices.filter((i) => !values.includes(i));
    }

    await selectInteraction.update({
      content: buildContent(selectedIndices, allSlots),
      components: buildComponents(allSlots, selectedIndices, currentDayKey, dayGroups),
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

    return selectedIndices.map((i) => allSlots[i]);
  } catch {
    await interaction.editReply({
      content: "⏱️ Timeout — probeer opnieuw met /wanneer.",
      components: [],
    });
    return null;
  }
};

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

const buildComponents = (
  remainingIndices: number[],
  selectedIndices: number[],
  slots: Date[],
) => {
  const rows: ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] = [];

  if (remainingIndices.length > 0) {
    const addSelect = new StringSelectMenuBuilder()
      .setCustomId("slot_add")
      .setPlaceholder("Voeg tijden toe...")
      .setMinValues(1)
      .setMaxValues(Math.min(10, remainingIndices.length))
      .addOptions(
        remainingIndices.slice(0, 25).map((i) => ({
          label: formatSlot(slots[i]),
          value: String(i),
        }))
      );
    rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(addSelect));
  }

  if (selectedIndices.length > 0) {
    const removeSelect = new StringSelectMenuBuilder()
      .setCustomId("slot_remove")
      .setPlaceholder("Verwijder een tijd...")
      .setMinValues(1)
      .setMaxValues(Math.min(10, selectedIndices.length))
      .addOptions(
        selectedIndices.map((i) => ({
          label: formatSlot(slots[i]),
          value: String(i),
        }))
      );
    rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(removeSelect));
  }

  const confirmButton = new ButtonBuilder()
    .setCustomId("slot_confirm")
    .setLabel("Maak poll")
    .setStyle(ButtonStyle.Primary)
    .setDisabled(selectedIndices.length === 0);
  rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton));

  return rows;
};

const buildContent = (selectedIndices: number[], slots: Date[]) => {
  if (selectedIndices.length === 0) return "Selecteer de tijden die je in de poll wilt zetten:";
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

  const allSlots = slots.slice(0, 25);
  let remainingIndices = allSlots.map((_, i) => i);
  let selectedIndices: number[] = [];

  const reply = await interaction.editReply({
    content: buildContent(selectedIndices, allSlots),
    components: buildComponents(remainingIndices, selectedIndices, allSlots),
  });

  const collector = reply.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    time: 5 * 60 * 1000,
  });

  collector.on("collect", async (selectInteraction: StringSelectMenuInteraction) => {
    const values = selectInteraction.values.map(Number);

    if (selectInteraction.customId === "slot_add") {
      selectedIndices = [...selectedIndices, ...values].sort((a, b) => a - b);
      remainingIndices = remainingIndices.filter((i) => !values.includes(i));
    } else if (selectInteraction.customId === "slot_remove") {
      remainingIndices = [...remainingIndices, ...values].sort((a, b) => a - b);
      selectedIndices = selectedIndices.filter((i) => !values.includes(i));
    }

    await selectInteraction.update({
      content: buildContent(selectedIndices, allSlots),
      components: buildComponents(remainingIndices, selectedIndices, allSlots),
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

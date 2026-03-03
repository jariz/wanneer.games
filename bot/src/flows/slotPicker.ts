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
import fetchSlots from "@/lib/fetchSlots";

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

export const runSlotPicker = async (
  interaction: ChatInputCommandInteraction,
  group: string,
  game: string | undefined
): Promise<Date[] | null> => {
  const slots = await fetchSlots(group);

  if (slots.length === 0) {
    await interaction.reply({
      content: "❌ Geen beschikbare tijden gevonden in de komende 10 dagen.",
      ephemeral: true,
    });
    return null;
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId("slot_select")
    .setPlaceholder("Selecteer tijden voor de poll...")
    .setMinValues(1)
    .setMaxValues(Math.min(10, slots.length))
    .addOptions(
      slots.slice(0, 25).map((slot, i) => ({
        label: formatSlot(slot),
        value: String(i),
      }))
    );

  const confirmButton = new ButtonBuilder()
    .setCustomId("slot_confirm")
    .setLabel("Maak poll")
    .setStyle(ButtonStyle.Primary)
    .setDisabled(true);

  const row1 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton);

  const reply = await interaction.reply({
    content: "Selecteer de tijden die je in de poll wilt zetten:",
    components: [row1, row2],
    ephemeral: true,
  });

  let selectedIndices: number[] = [];

  const collector = reply.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    time: 5 * 60 * 1000, // 5 minute timeout
  });

  collector.on("collect", async (selectInteraction: StringSelectMenuInteraction) => {
    selectedIndices = selectInteraction.values.map(Number);

    const updatedButton = ButtonBuilder.from(confirmButton).setDisabled(false);
    const updatedRow = new ActionRowBuilder<ButtonBuilder>().addComponents(updatedButton);

    await selectInteraction.update({ components: [row1, updatedRow] });
  });

  // Wait for the confirm button
  try {
    const buttonInteraction = await reply.awaitMessageComponent({
      componentType: ComponentType.Button,
      filter: (i) => i.customId === "slot_confirm",
      time: 5 * 60 * 1000,
    });

    collector.stop();

    if (selectedIndices.length === 0) {
      await buttonInteraction.update({
        content: "❌ Geen tijden geselecteerd.",
        components: [],
      });
      return null;
    }

    await buttonInteraction.update({
      content: "✅ Poll wordt aangemaakt...",
      components: [],
    });

    return selectedIndices.map((i) => slots[i]);
  } catch {
    // Timeout
    await interaction.editReply({
      content: "⏱️ Timeout — probeer opnieuw met /wanneer.",
      components: [],
    });
    return null;
  }
};

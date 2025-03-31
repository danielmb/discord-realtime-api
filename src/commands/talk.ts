import { AudioPlayer } from '@discordjs/voice';
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { SpeechHandler } from '../api/discord/speech.js';
import { logger } from '../config/logger.js';
import { Embeds } from '../utils/embedHelper.js';
import { VoiceConnectionHandler } from '../api/openai/voiceConnection.js';
import { OpenAIConversationalAI } from '../api/openai/conversationClient.js';
import { OPENAI_CONFIG } from '../config/config.js';

export const data = new SlashCommandBuilder()
  .setName('talk')
  .setDescription(
    'Unleash an auditory adventure with a voice that echoes from the digital realm.',
  );

/**
 * Executes the talk command.
 *
 * @param {CommandInteraction} interaction - The interaction object representing the command execution.
 * @returns {Promise<void>}
 */
export async function execute(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  try {
    const audioPlayer = new AudioPlayer();

    const openAiConversationalAI = new OpenAIConversationalAI(
      audioPlayer,
      OPENAI_CONFIG.API_KEY,
    );
    const connectionHandler = new VoiceConnectionHandler(interaction);

    const connection = await connectionHandler.connect();
    if (!connection) {
      return;
    }

    connection.subscribe(audioPlayer);

    const speechHandler = new SpeechHandler(openAiConversationalAI, connection);
    speechHandler.initialize();
  } catch (error) {
    logger.error(error, 'Something went wrong during voice mode');

    await interaction.reply({
      embeds: [
        Embeds.error(
          'Error',
          'An error occurred while starting the voice chat.',
        ),
      ],
      ephemeral: true,
    });
  }
}

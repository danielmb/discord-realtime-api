import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { DISCORD_CONFIG, logger } from '../config/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Deploys application commands to the Discord API.
 * @async
 * @returns {Promise<void>} A promise that resolves when the commands are deployed.
 * @throws Will throw an error if there is an issue loading or refreshing commands.
 */

export async function deployCommands(): Promise<void> {
  const commands: any[] = [];
  const commandsPath = path.join(__dirname, '../commands');

  try {
    // check if file ends with .js

    for (const file of readdirSync(commandsPath)) {
      if (!file.endsWith('.js')) continue;
      logger.info(`Loading command file: ${file}`);

      const command = await import(`file://${path.join(commandsPath, file)}`);

      if (!('data' in command) || !('execute' in command)) {
        logger.info(
          `The command at ${file} is missing a required "data" or "execute" property.`,
        );
        continue;
      }

      commands.push(command.data.toJSON() as any);
    }

    const rest = new REST().setToken(DISCORD_CONFIG.BOT_TOKEN);

    logger.info('Started refreshing application (/) commands.');
    await rest.put(Routes.applicationCommands(DISCORD_CONFIG.CLIENT_ID), {
      body: commands,
    });

    logger.info('Successfully reloaded application (/) commands.');
  } catch (error) {
    logger.error(error, 'Error loading commands or refreshing them');
  }
}

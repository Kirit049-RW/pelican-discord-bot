const CommandContext = require('../../managers/CommandContext');
const { PermissionsBitField, MessageFlags } = require('discord.js');

module.exports = class SlashCommandsService {
    constructor(event) {
        this.client = event.client
        this.logger = event.logger
        this.slashLogger = event.slashLogger
        this.messageFormatter = event.messageFormatter
    }

    async handle (inter) {
        // Check if the interaction is a command
        if (!inter.isChatInputCommand()) return

        // Check if the interaction is in DM
        if (inter.channel.type === 1) return inter.reply({content: this.messageFormatter.error('No available in DM !'), flags: MessageFlags.Ephemeral});

        // Check if the bot can see & write in the channel
        if (!inter.channel.permissionsFor(this.client.user.id)?.has(PermissionsBitField.Flags.ViewChannel))
            return inter.reply({content: this.messageFormatter.error('I need \`ViewChannel\` permission!'), flags: MessageFlags.Ephemeral});

        if (!inter.channel.permissionsFor(this.client.user.id)?.has(PermissionsBitField.Flags.SendMessages))
            return inter.reply({content: this.messageFormatter.error('I need \`SendMessages\` permission!'), flags: MessageFlags.Ephemeral});

        if (!inter.channel.permissionsFor(this.client.user.id)?.has(PermissionsBitField.Flags.SendMessagesInThreads))
            return inter.reply({content: this.messageFormatter.error('I need \`SendMessagesInThreads\` permission!'), flags: MessageFlags.Ephemeral});

        // Get the command
        const slashCmd = this.client.slashCommandsHandler.getSlashCommand(inter.commandName);
        if (!slashCmd) return inter.reply({content: this.messageFormatter.error('This command does not exist!'), flags: MessageFlags.Ephemeral});

        // Retrieving bot member information
        const me = await inter.guild.members.fetch(this.client.user.id);

        // Check if the bot has the right permissions
        if (slashCmd.bot_permissions.length > 0 && !slashCmd.bot_permissions.every((p) => me.permissions.has(p))) {
            return inter.reply({content: `${this.client.emojiError} I need the following permissions: ${'`' + slashCmd.bot_permissions.join("`, `") + '`'}!`});
        }

        // Create the command context
        const ctx = new CommandContext(this.client, slashCmd, inter);

        slashCmd.run(ctx).catch((err) => {
            console.log(err);
            inter.reply({content: this.messageFormatter.error('An error occurred, the developers have been notified!'), flags: MessageFlags.Ephemeral}).catch(() => null);
        });

        this.slashLogger.slashCommand(inter);
    }

    async autoComplete(inter) {
        // Check if the interaction is an autocomplete command
        if (!inter.isAutocomplete()) return

        // Get the command
        const slashCmd = this.client.slashCommandsHandler.getSlashCommand(inter.commandName);
        if (!slashCmd) return this.logger.error(`AutoComplete command not found: ${inter.commandName}`);

        // Create the command context
        const ctx = new CommandContext(this.client, slashCmd, inter);

        slashCmd.runAutoComplete(ctx).catch((err) => {
            console.log(err);
        });
    }
}

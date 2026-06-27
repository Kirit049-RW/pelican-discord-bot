const SlashCommand = require('../../managers/structures/SlashCommands.js');
const { EmbedBuilder } = require('discord.js');

module.exports = class Ping extends SlashCommand {
    constructor(handler) {
        super(handler,{
            name: 'ping',
            description: 'Show the ping of the bot',
            description_localizations: {
                "fr": "Afficher le ping du bot"
            },
            category: SlashCommand.Categories.Misc,
            bot_permissions: ['EmbedLinks']
        });
    }

    async run (ctx) {
        const embed = new EmbedBuilder()
            .setTitle('Pong !')
            .setDescription(`:robot: The latency of the bot is **${Date.now() - ctx.inter.createdTimestamp} ms**\n:satellite: The ping of the API is **${Math.round(ctx.client.ws.ping)} ms**`)
            .setColor(ctx.me.displayHexColor)

        ctx.send({ embeds: [embed] });
    }
}

const SlashCommand = require('../../../managers/structures/SlashCommands.js');
const { EmbedBuilder } = require('discord.js');

module.exports = class MonitoringList extends SlashCommand {
    constructor(handler) {
        super(handler,{
            name: 'monitoring-list',
            description: 'Display the list of all Discord bots monitored',
            description_localizations: {
                "fr": "Afficher la liste des bots Discord surveillés"
            },
            category: SlashCommand.Categories.Admin,
            user_permissions: ['Administrator'],
            bot_permissions: ['EmbedLinks']
        });
    }

    async run (ctx) {
        const monitoring = await ctx.database.table('monitoring_discord_bot');
        if (!monitoring[0]) return ctx.error('There is no bot monitored!');

        const embed = new EmbedBuilder()
            .setTitle('List of monitored bots')
            .setColor(ctx.me.displayHexColor)
            .setThumbnail(ctx.me.displayAvatarURL())
            .setDescription(monitoring.map(m => {
                const botMember = ctx.getMember(m.botId);

                return `• ${botMember ? `**${botMember.displayName}** (\`${m.botId}\`)` : `\`${m.botId}\``} since <t:${Math.floor(m.createdAt / 1000)}:R>`
            }).join('\n'))

        ctx.send({ embeds: [embed] });
    }
}

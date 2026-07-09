const SlashCommand = require('../../../managers/structures/SlashCommands.js');
const { EmbedBuilder } = require('discord.js');

module.exports = class MonitoringDiscordBots extends SlashCommand {
    constructor(handler) {
        super(handler,{
            name: 'monitoring-bots',
            description: 'Manage the Discord bots monitored',
            options: [{
                name: 'add',
                description: 'Add a Discord bot to the monitoring',
                description_localizations: {
                    "fr": "Ajouter un bot Discord à la surveillance"
                },
                type: 1,
                options: [{
                    name: "bot",
                    description: "The bot to monitor",
                    description_localizations: {
                        "fr": "Le bot à surveiller"
                    },
                    type: 6,
                    required: true
                }]
            }, {
                name: 'list',
                description: 'Display the list of all Discord bots monitored',
                description_localizations: {
                    "fr": "Afficher la liste des bots Discord surveillés"
                },
                type: 1
            }, {
                name: 'remove',
                description: 'Remove a Discord bot from the monitoring',
                description_localizations: {
                    "fr": "Retirer un bot Discord de la surveillance"
                },
                type: 1,
                options: [{
                    name: "bot",
                    description: "The bot to remove",
                    description_localizations: {
                        "fr": "Le bot à retirer"
                    },
                    type: 6,
                    required: true
                }]
            }],
            category: SlashCommand.Categories.Admin,
            user_permissions: ['Administrator']
        });
    }

    async run (ctx) {
        const subCommand = ctx.options.getSubcommand();

        if (subCommand === 'add') {
            const botMember = ctx.options.getMember('bot');
            if (!botMember) return ctx.error('This bot is not on this server!');

            /* Check if the bot is a bot */
            if (!botMember.user.bot) return ctx.error('This user is not a bot!');

            /* Check if the bot is this bot */
            if (botMember.user.id === ctx.client.user.id) return ctx.error('I can\'t monitor myself!');

            /* Check if the bot is already monitored */
            const monitoring = await ctx.database.table('monitoring_discord_bot').where('botId', botMember.user.id);
            if (monitoring[0]) return ctx.error('This bot is already monitored!');

            /* Add the bot to the monitoring */
            await ctx.database.table('monitoring_discord_bot').insert({
                botId: botMember.user.id,
                createdAt: Date.now()
            });

            /* Send the success message */
            ctx.send({ content: `${ctx.emojiSuccess} The bot **${botMember.user.displayName}** has been added to the monitoring!` });
        }
        else if (subCommand === 'list') {
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
        else if (subCommand === 'remove') {
            const bot = ctx.options.getUser('bot');

            /* Check if the bot is a bot */
            if (!bot.bot) return ctx.error('This user is not a bot!');

            /* Check if the bot is monitored */
            const monitoring = await ctx.database.table('monitoring_discord_bot').where('botId', bot.id);
            if (!monitoring[0]) return ctx.error('This bot is not monitored!');

            /* Remove the bot from the monitoring */
            await ctx.database.table('monitoring_discord_bot').delete().where({ botId: bot.id });

            /* Send the success message */
            ctx.send({ content: `${ctx.emojiSuccess} The bot **${bot.displayName}** has been removed from the monitoring!` });
        }
    }
}

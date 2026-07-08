const SlashCommand = require('../../../managers/structures/SlashCommands.js');

module.exports = class MonitoringRemove extends SlashCommand {
    constructor(handler) {
        super(handler,{
            name: 'monitoring-remove',
            description: 'Remove a Discord bot from the monitoring',
            description_localizations: {
                "fr": "Retirer un bot Discord de la surveillance"
            },
            options: [{
                name: "bot",
                description: "The bot to remove",
                description_localizations: {
                    "fr": "Le bot à retirer"
                },
                type: 6,
                required: true
            }],
            category: SlashCommand.Categories.Admin,
            user_permissions: ['Administrator']
        });
    }

    async run (ctx) {
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

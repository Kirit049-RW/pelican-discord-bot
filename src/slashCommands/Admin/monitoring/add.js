const SlashCommand = require('../../../managers/structures/SlashCommands.js');

module.exports = class MonitoringAdd extends SlashCommand {
    constructor(handler) {
        super(handler,{
            name: 'monitoring-add',
            description: 'Add a bot to the monitoring',
            description_localizations: {
                "fr": "Ajouter un bot à la surveillance"
            },
            options: [{
                name: "bot",
                description: "The bot to monitor",
                description_localizations: {
                    "fr": "Le bot à surveiller"
                },
                type: 6,
                required: true
            }],
            category: SlashCommand.Categories.Admin,
            user_permissions: ['Administrator']
        });
    }

    async run (ctx) {
        const botMember = ctx.options.getMember('bot');
        if (!botMember) return ctx.error('This bot is not on this server!');

        /* Check if the bot is a bot */
        if (!botMember.user.bot) return ctx.error('This user is not a bot!');

        /* Check if the bot is this bot */
        if (botMember.user.id === ctx.client.user.id) return ctx.error('I can\'t monitor myself!');

        /* Check if the bot is already monitored */
        const monitoring = await ctx.database.table('monitoring').where('botId', botMember.user.id);
        if (monitoring[0]) return ctx.error('This bot is already monitored!');

        /* Add the bot to the monitoring */
        await ctx.database.table('monitoring').insert({
            botId: botMember.user.id,
            createdAt: Date.now()
        });

        /* Send the success message */
        ctx.send({ content: `${ctx.emojiSuccess} The bot **${botMember.user.displayName}** has been added to the monitoring!` });
    }
}

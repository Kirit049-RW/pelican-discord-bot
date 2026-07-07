const SlashCommand = require('../../managers/structures/SlashCommands.js');

module.exports = class GenerateLink extends SlashCommand {
    constructor(handler) {
        super(handler,{
            name: 'generate-link',
            description: 'Generate a new Discord Bot Invitation link',
            description_localizations: {
                "fr": "Générer un lien d\'invitation d\'un bot Discord"
            },
            options: [{
                name: 'bot-id',
                description: 'The id of the bot',
                description_localizations: {
                    "fr": "L'id du bot"
                },
                type: 3,
                required: true
            }],
            category: SlashCommand.Categories.Misc
        });
    }

    async run (ctx) {
        const botId = ctx.options.getString('bot-id');

        ctx.send({ content: `${ctx.emojiSuccess} [Click here!](https://discord.com/api/oauth2/authorize?client_id=${botId}&permissions=8&scope=bot)`});
    }
}
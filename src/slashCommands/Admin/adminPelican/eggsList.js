const SlashCommand = require('../../../managers/structures/SlashCommands.js');
const { EmbedBuilder } = require('discord.js');

module.exports = class EggsList extends SlashCommand {
    constructor(handler) {
        super(handler,{
            name: 'eggs-list',
            description: 'Get the list of all eggs on the pelican panel',
            description_localizations: {
                "fr": "Obtenir la liste de tous les oeufs du panel pelican"
            },
            category: SlashCommand.Categories.AdminPelican,
            user_permissions: ['Administrator']
        });
    }

    async run (ctx) {

        try {
            /* Retrieve eggs from Pelican */
            const eggsPelican = await ctx.pelican.requestApplication(`eggs`);
            if (!eggsPelican) return ctx.error('This node does not exist!');

            const eggs = eggsPelican.sort((a, b) => a.attributes.name.localeCompare(b.attributes.name));

            const embed = new EmbedBuilder()
                .setColor(ctx.me.displayHexColor)
                .setTitle('List of all eggs')
                .setThumbnail(ctx.me.displayAvatarURL())
                .setDescription(eggs.map(egg => {
                    return `- [**${egg.attributes.name}**](${ctx.config["pelican"]["url"].endsWith("/") ? ctx.config["pelican"]["url"].slice(0, -1) : ctx.config["pelican"]["url"]}/admin/eggs/${egg.attributes.id}/edit)`
                }).join('\n'))

            ctx.send({ embeds: [embed] });
        } catch (err) {
            ctx.pelican.handlePelicanError(err, 'eggs');
            ctx.error('An error occurred while trying to get the eggs from Pelican!');
        }
    }
}

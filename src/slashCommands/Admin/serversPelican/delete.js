const SlashCommand = require('../../../managers/structures/SlashCommands.js');
const { EmbedBuilder } = require('discord.js');

module.exports = class ServerDelete extends SlashCommand {
    constructor(handler) {
        super(handler,{
            name: 'server-delete',
            description: 'Delete a server',
            description_localizations: {
                "fr": "Supprimer un serveur"
            },
            options: [{
                name: "server",
                description: "The server to delete",
                description_localizations: {
                    "fr": "Le serveur à supprimer"
                },
                type: 3,
                required: true,
                autocomplete: true
            }],
            category: SlashCommand.Categories.ServerPelican,
            user_permissions: ['Administrator']
        });
    }

    async run (ctx) {
        const serverPelicanId = Number(ctx.options.getString('server'));

        /* Check if this pelican server exists */
        try {
            const serverPelican = await ctx.pelican.requestApplication(`servers/${serverPelicanId}`);
            if (!serverPelican) return ctx.error('This server does not exist!');

            /* Ask for confirmation */
            const embedAsk = new EmbedBuilder()
                .setDescription(`**Are you sure you want to delete the server ${serverPelican.attributes.name}?**`)
                .setColor(ctx.me.displayColor)

            const msgAsk = await ctx.send({
                embeds: [embedAsk],
                components: ctx.messageFormatter.question()
            });

            const filter = (button) => button.user.id === ctx.user.id;
            const collectorAsk = msgAsk.createMessageComponentCollector({ filter, idle: 5 * 60 * 1000, componentType: 2 });
            collectorAsk.on('collect', async (button) => {
                await button.deferUpdate();
                collectorAsk.stop();

                // If the user cancels the confirmation
                if (button.customId !== 'yes') return button.message.edit({ content: `${ctx.emojiError} The deletion has been canceled!`, embeds: [], components: [] });

                /* Delete the server */
                try {
                    await ctx.pelican.requestApplication(`servers/${serverPelicanId}`, 'delete');

                    button.message.edit({ content: `${ctx.emojiSuccess} The server **${serverPelican.attributes.name}** has been deleted!`, embeds: [], components: [] });
                } catch (err) {
                    ctx.pelican.handlePelicanError(err, `servers/${serverPelicanId}`, 'delete');
                    button.message.edit({ content: `${ctx.emojiError} The server **${serverPelican.attributes.name}** could not be deleted!`, embeds: [], components: [] });
                }
            });
        } catch (err) {
            ctx.pelican.handlePelicanError(err, `servers/${serverPelicanId}`);
            ctx.error('An error occurred while trying to get the server!');
        }
    }

    async runAutoComplete(ctx) {
        /* Get the focussed query */
        const focussedQuery = ctx.options.getFocused();
        if (!focussedQuery) return ctx.inter.respond([{ name: "Write the first letter of the server", value: "nothing_found" }]);

        /* Search for the list of servers */
        try {
            const serversPelican = await ctx.pelican.requestApplication("servers");

            if (serversPelican.length === 0) return ctx.inter.respond([{ name: "No server found", value: "nothing_found" }]);

            const res = serversPelican.filter(s => s.attributes.name.toLowerCase().includes(focussedQuery.toLowerCase())).map(s => ({ name: s.attributes.name, value: String(s.attributes.id) })).slice(0, 25);
            if (res.length === 0) return ctx.inter.respond([{ name: "No server found", value: "nothing_found" }]);

            return ctx.inter.respond(res);
        } catch (err) {
            ctx.pelican.handlePelicanError(err, 'servers');
        }
    }
}

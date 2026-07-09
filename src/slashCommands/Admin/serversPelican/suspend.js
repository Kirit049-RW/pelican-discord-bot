const SlashCommand = require('../../../managers/structures/SlashCommands.js');

module.exports = class ServerSuspend extends SlashCommand {
    constructor(handler) {
        super(handler,{
            name: 'server-suspend',
            description: 'Suspend a server',
            description_localizations: {
                "fr": "Suspendre un serveur"
            },
            options: [{
                name: "server",
                description: "The server to suspend",
                description_localizations: {
                    "fr": "Le serveur à suspendre"
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

            /* Check if the server is already suspended */
            if (serverPelican.suspended === true) return ctx.error('This server is already suspended!');

            /* Suspend the server */
            try {
                await ctx.pelican.requestApplication(`servers/${serverPelicanId}/suspend`, 'post');

                ctx.send({ content: `${ctx.emojiSuccess} The server **${serverPelican.attributes.name}** has been suspended!`});
            } catch (err) {
                ctx.pelican.handlePelicanError(err, `servers/${serverPelicanId}/suspend`, 'post');
                ctx.error(`The server **${serverPelican.attributes.name}** could not be suspended!`);
            }
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

            const res = serversPelican.filter(s => s.attributes.name.toLowerCase().includes(focussedQuery.toLowerCase())).map(s => ({ name: ctx.utils.capitalize(s.attributes.name), value: String(s.attributes.id) })).slice(0, 25);
            if (res.length === 0) return ctx.inter.respond([{ name: "No server found", value: "nothing_found" }]);

            return ctx.inter.respond(res);
        } catch (err) {
            ctx.pelican.handlePelicanError(err, 'servers');
        }
    }
}

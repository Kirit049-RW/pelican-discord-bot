const SlashCommand = require('../../../managers/structures/SlashCommands.js');
const ms = require('ms');
const schedule = require('node-schedule');

module.exports = class ServerUnsuspend extends SlashCommand {
    constructor(handler) {
        super(handler,{
            name: 'server-unsuspend',
            description: 'Unsuspend a server',
            description_localizations: {
                "fr": "Lever la suspension d\'un serveur"
            },
            options: [{
                name: "server",
                description: "The server to unsuspend",
                description_localizations: {
                    "fr": "Le serveur à lever la suspension"
                },
                type: 3,
                required: true,
                autocomplete: true
            }, {
                name: 'time',
                name_localizations: {
                    "fr": "temps",
                },
                description: 'Time to suspend the server in day',
                description_localizations: {
                    "fr": "Temps à suspendre le serveur en jour",
                },
                type: 4,
                required: false,
                min_value: 1,
                max_value: 365
            }],
            category: SlashCommand.Categories.ServerPelican,
            user_permissions: ['Administrator']
        });
    }

    async run (ctx) {
        const serverPelicanId = Number(ctx.options.getString('server'));
        const time = ctx.options.getInteger('time') || null;

        /* Check if the time is correct */
        if (time && !ms(`${time}d`)) return ctx.error('The time format is incorrect!');

        /* Check if this pelican server exists */
        try {
            const serverPelican = await ctx.pelican.requestApplication(`servers/${serverPelicanId}`);
            if (!serverPelican) return ctx.error('This server does not exist!');

            /* Check if the server is already unsuspended */
            if (serverPelican.suspended === false) return ctx.error('This server is already unsuspended!');

            /* Unsuspend the server */
            try {
                await ctx.pelican.requestApplication(`servers/${serverPelicanId}/unsuspend`, 'post');

                ctx.send({ content: `${ctx.emojiSuccess} The server **${serverPelican.attributes.name}** has been unsuspended!`});

                if (time) {
                    const timing = Date.now() + ms(`${time}d`);

                    /* Add to database */
                    await ctx.database.table('schedule_servers').insert({ serverId: serverPelican.attributes.id, time: timing });

                    schedule.scheduleJob(`${serverPelican.attributes.id}`, timing, async () => {
                        /* Suspend the server */
                        try {
                            await ctx.pelican.requestApplication(`servers/${serverPelicanId}/suspend`, 'post');

                            ctx.client.logger.warn(`Schedule Suspend Server: ${serverPelican.attributes.name} (${serverPelican.attributes.id})`);

                            /* Delete it from database */
                            await ctx.database.table('schedule_servers').delete().where('serverId', serverPelican.attributes.id);
                        } catch (err) {
                            ctx.pelican.handlePelicanError(err, `servers/${serverPelicanId}/suspend`, 'post');

                            ctx.client.logger.warn(`Schedule Suspend Server: An error occurred on ${serverPelican.attributes.name} (${serverPelican.attributes.id})`);
                        }
                    });
                }
            } catch (err) {
                ctx.pelican.handlePelicanError(err, `servers/${serverPelicanId}/unsuspend`, 'post');
                ctx.error(`The server **${serverPelican.attributes.name}** could not be unsuspended!`);
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

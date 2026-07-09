const SlashCommand = require('../../../managers/structures/SlashCommands.js');
const ms = require('ms');
const schedule = require('node-schedule');

module.exports = class ServerAddTime extends SlashCommand {
    constructor(handler) {
        super(handler,{
            name: 'server-add-time',
            description: 'Add time to a server',
            description_localizations: {
                "fr": "Ajouter du temps à un serveur"
            },
            options: [{
                name: "server",
                description: "The server to add time",
                description_localizations: {
                    "fr": "Le serveur à ajouter du temps"
                },
                type: 4,
                required: true
            }, {
                name: 'time',
                name_localizations: {
                    "fr": "temps",
                },
                description: 'Time to add to the server in day',
                description_localizations: {
                    "fr": "Temps à ajouter au serveur en jour",
                },
                type: 4,
                required: true,
                min_value: 1,
                max_value: 365
            }],
            category: SlashCommand.Categories.ServerPelican,
            user_permissions: ['Administrator']
        });
    }

    async run (ctx) {
        const serverPelicanId = Number(ctx.options.getString('server'));
        const time = ctx.options.getInteger('time');

        /* Check if the time is correct */
        if (!ms(`${time}d`)) return ctx.error('The time format is incorrect!');

        /* Check if this pelican server exists */
        try {
            const serverPelican = await ctx.pelican.requestApplication(`servers/${serverPelicanId}`);
            if (!serverPelican) return ctx.error('This server does not exist!');

            /* Get the database */
            const serverDatabase = await ctx.database.table('schedule_servers').select().where({ serverId: serverPelican.attributes.id });
            let timing

            if (serverDatabase[0]) {
                timing = serverDatabase[0].time + ms(`${time}d`);

                /* Update to database */
                await ctx.database.table('schedule_servers').update({ time: timing }).where({ serverId: serverPelican.attributes.id });

                /* Get the old schedule */
                const oldSchedule = schedule.scheduledJobs[`${serverPelican.attributes.id}`];

                /* Cancel the old schedule */
                if (oldSchedule) oldSchedule.cancel();

                /* Send a success message */
                ctx.send({
                    content: `${ctx.emojiSuccess} The time of the server **${serverPelican.attributes.name}** has been updated! It has been changed from <t:${Math.floor(serverDatabase[0].time / 1000)}:d> to <t:${Math.floor(timing / 1000)}:d>.`
                });
            }
            else {
                timing = Date.now() + ms(`${time}d`);

                /* Add to database */
                await ctx.database.table('schedule_servers').insert({ serverId: serverPelican.attributes.id, time: timing });

                /* Send a success message */
                ctx.send({
                    content: `${ctx.emojiSuccess} The time of the server **${serverPelican.attributes.name}** has been created! It is set until <t:${Math.floor(timing / 1000)}:d>.`
                });
            }

            /* Create schedule */
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

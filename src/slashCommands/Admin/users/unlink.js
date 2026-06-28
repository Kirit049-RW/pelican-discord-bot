const SlashCommand = require('../../../managers/structures/SlashCommands.js');

module.exports = class UserUnlink extends SlashCommand {
    constructor(handler) {
        super(handler,{
            name: 'user-unlink',
            description: 'Unlink a Discord user to a pelican user',
            description_localizations: {
                "fr": "Délier un utilisateur Discord à un utilisateur pelican"
            },
            options: [{
                name: 'type',
                description: 'Type of the data',
                description_localizations: {
                    "fr": "Type de la donnée"
                },
                type: 3,
                required: true,
                choices: [{
                    name: 'Discord',
                    value: 'discord'
                }, {
                    name: 'Pelican',
                    value: 'pelican'
                }]
            }, {
                name: 'discord-user',
                description: 'Discord user to unlink',
                description_localizations: {
                    "fr": "Utilisateur Discord à délier"
                },
                type: 6,
                required: false
            }, {
                name: 'pelican-user',
                description: 'Pelican user to unlink',
                description_localizations: {
                    "fr": "Utilisateur pelican à délier"
                },
                type: 3,
                required: false,
                autocomplete: true
            }],
            category: SlashCommand.Categories.UserPelican,
            user_permissions: ['Administrator']
        });
    }

    async run (ctx) {
        const type = ctx.options.getString('type');
        const userDiscord = ctx.options.getUser('discord-user') || null;
        const userPelicanId = Number(ctx.options.getString('pelican-user')) || null;

        /* Check if data is provided */
        if (!userDiscord && !userPelicanId) return ctx.error('You have to provide a type of data between Discord or pelican!');

        /* Check if 2 data are provided */
        if (userDiscord && userPelicanId) return ctx.error('You can\'t provide both Discord and pelican data at the same time!');

        if (type === 'discord') {
            /* Check if a valid discord user is provided */
            if (!userDiscord) return ctx.error('You have to provide a Discord user!');

            /* Check if this discord user exists */
            const userDiscordExist = await ctx.database.table('users').select().where('discordId', userDiscord.id);
            if (!userDiscordExist[0]) return ctx.error('This Discord user is not linked to a pelican user!');

            /* Retrieve pelican user information */
            const userPelican = await ctx.pelican.requestApplication(`users/${userPelicanId}`).catch(() => null);

            /* Delete it in the database */
            await ctx.database.table('users').delete().where('discordId', userDiscord.id);

            /* Send success message */
            ctx.send({
                content: `${ctx.emojiSuccess} The Discord user **${userDiscord.displayName}** has been successfully unlinked to the pelican user ${userPelican ? `**${ctx.utils.capitalize(userPelican.attributes.username)}**` : `\`${userDiscordExist[0].userPelicanId}\``}!`
            });
        }
        else if (type === 'pelican') {
            /* Check if a valid pelican user is provided */
            if (!userPelicanId) return ctx.error('You have to provide a pelican user!');

            /* Check if this pelican user exists */
            const userPelicanExist = await ctx.database.table('users').select().where('userPelicanId', userPelicanId);
            if (!userPelicanExist[0]) return ctx.error('This pelican user is not linked to a Discord user!');

            /* Retrieve pelican user information */
            const userPelican = await ctx.pelican.requestApplication(`users/${userPelicanId}`).catch(() => null);

            /* Retrieve Discord user information */
            const userDiscord = await ctx.client.users.fetch(userPelicanExist[0].discordId).catch(() => null);

            /* Delete it in the database */
            await ctx.database.table('users').delete().where('userPelicanId', userPelicanId);

            /* Send success message */
            ctx.send({
                content: `${ctx.emojiSuccess} The pelican user ${userPelican ? `**${ctx.utils.capitalize(userPelican.attributes.username)}**` : `\`${userPelicanId}\``} has been successfully unlinked to the Discord user ${userDiscord ? `**${userDiscord.displayName}**` : `\`${userPelicanExist[0].discordId}\``}!`
            });
        }
    }

    async runAutoComplete(ctx) {
        /* Get the focussed query */
        const focussedQuery = ctx.options.getFocused();
        if (!focussedQuery) return ctx.inter.respond([{ name: "Write the first letter of the username", value: "nothing_found" }]);

        /* Search for the list of servers */
        try {
            const usersPelican = await ctx.pelican.requestApplication("users");

            if (usersPelican.length === 0) return ctx.inter.respond([{ name: "No user found", value: "nothing_found" }]);

            const res = usersPelican.filter(u => u.attributes.username.toLowerCase().includes(focussedQuery.toLowerCase())).map(u => ({ name: ctx.utils.capitalize(u.attributes.username), value: String(u.attributes.id) })).slice(0, 25);
            if (res.length === 0) return ctx.inter.respond([{ name: "No user found", value: "nothing_found" }]);

            return ctx.inter.respond(res);
        } catch (err) {
            ctx.pelican.handlePelicanError(err, '/users');
        }
    }
}

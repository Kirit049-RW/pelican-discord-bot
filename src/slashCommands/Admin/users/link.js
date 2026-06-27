const SlashCommand = require('../../../managers/structures/SlashCommands.js');

module.exports = class UserLink extends SlashCommand {
    constructor(handler) {
        super(handler,{
            name: 'user-link',
            description: 'Link a Discord user to a pelican user',
            description_localizations: {
                "fr": "Lier un utilisateur Discord à un utilisateur pelican"
            },
            options: [{
                name: 'discord-user',
                description: 'Discord user to link',
                description_localizations: {
                    "fr": "Utilisateur Discord à lier"
                },
                type: 6,
                required: true
            }, {
                name: 'pelican-user',
                description: 'Pelican user to link',
                description_localizations: {
                    "fr": "Utilisateur pelican à lier"
                },
                type: 3,
                required: true,
                autocomplete: true
            }],
            category: SlashCommand.Categories.UserPelican,
            user_permissions: ['Administrator']
        });
    }

    async run (ctx) {
        const userDiscord = ctx.options.getUser('discord-user');
        const userPelicanId = ctx.options.getString('pelican-user');

        /* Check if this discord user is a bot */
        if (userDiscord.bot) return ctx.error('You can\'t link a bot to a pelican user!');

        /* Check if this pelican user is already attributed with another discord user */
        const userPelicanAlreadyExist = await ctx.database.table('users').select().where('userPelicanId', Number(userPelicanId));
        if (userPelicanAlreadyExist[0]) return ctx.error('This pelican user is already linked to a Discord user!');

        /* Check if this discord user is already attributed with another pelican user */
        const userDiscordAlreadyExist = await ctx.database.table('users').select().where('discordId', userDiscord.id);
        if (userDiscordAlreadyExist[0]) return ctx.error('This Discord user is already linked to a pelican user!');

        /* Check if this pelican user exists */
        try {
            const userPelican = await ctx.pelican.requestApplication(`users/${userPelicanId}`);
            if (!userPelican) return ctx.error('This user does not exist!');

            /* Add in the database */
            await ctx.database.table('users').insert({ discordId: userDiscord.id, userPelicanId: Number(userPelicanId) });

            /* Send success message */
            ctx.send({
                content: `${ctx.emojiSuccess} The Discord user **${userDiscord.displayName}** has been successfully linked to the pelican user **${ctx.utils.capitalize(userPelican.attributes.username)}**!`
            });
        } catch (err) {
            ctx.pelican.handlePelicanError(err, '/users/{user}');
            ctx.error('An error occurred while trying to get the user from Pelican !');
        }
    }

    async runAutoComplete(ctx) {
        /* Get the focussed query */
        const focussedQuery = ctx.options.getFocused();
        if (!focussedQuery) return ctx.inter.respond([{ name: "Write the first letter of the username", value: "nothing_found" }]);

        /* Search for the list of users */
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

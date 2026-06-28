const SlashCommand = require('../../../managers/structures/SlashCommands.js');

module.exports = class UserDelete extends SlashCommand {
    constructor(handler) {
        super(handler,{
            name: 'user-delete',
            description: 'Delete a user from the pelican panel',
            description_localizations: {
                "fr": "Supprimer un utilisateur du panel pelican"
            },
            options: [{
                name: 'pelican-user',
                description: 'Pelican user to delete',
                description_localizations: {
                    "fr": "Utilisateur pelican à supprimer"
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
        const userPelicanId = ctx.options.getString('pelican-user');

        /* Check if this pelican user exists */
        try {
            const userPelican = await ctx.pelican.requestApplication(`users/${userPelicanId}?include=servers`);
            if (!userPelican) return ctx.error('This user does not exist!');

            /* Protect admin user */
            if (userPelican.root_admin) return ctx.error('This user is an admin, you can\'t delete it !');

            /* Check if the user has servers */
            if (userPelican.attributes.relationships.servers.data.length > 0) return ctx.error('This user has servers, you must delete them before deleting the user !');

            // Delete the user on Pelican
            try {
                await ctx.pelican.requestApplication(`users/${userPelicanId}`, 'delete');

                /* Delete the user from the database */
                await ctx.database.table('users').delete().where('userPelicanId', Number(userPelicanId));

                ctx.send({ content: `${ctx.emojiSuccess} The user \`${userPelican.attributes.username}\` has been deleted from Pelican!`});
            } catch (err) {
                ctx.pelican.handlePelicanError(err, `users/${userPelicanId}`, 'delete');
                ctx.error(`The user \`${userPelican.attributes.username}\` could not be deleted from Pelican!`);
            }
        } catch (err) {
            ctx.pelican.handlePelicanError(err, `users/${userPelicanId}`, 'delete');
            ctx.error('An error occurred while trying to get the user from Pelican!');
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

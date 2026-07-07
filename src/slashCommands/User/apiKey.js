const SlashCommand = require('../../managers/structures/SlashCommands.js');

module.exports = class ApiKey extends SlashCommand {
    constructor(handler) {
        super(handler,{
            name: 'api-key',
            description: 'Manage your API key',
            description_localizations: {
                "fr": "Gérer votre clé API"
            },
            options: [{
                name: 'add',
                description: 'Add your API key',
                description_localizations: {
                    "fr": "Ajouter votre clé API"
                },
                type: 1,
                options: [{
                    name: 'key',
                    description: 'Your API key',
                    description_localizations: {
                        "fr": "Votre clé API"
                    },
                    type: 3,
                    required: true
                }]
            }, {
                name: "delete",
                description: "Delete your API key",
                description_localizations: {
                    "fr": "Supprimer votre clé API"
                },
                type: 1
            }],
            category: SlashCommand.Categories.Misc
        });
    }

    async run (ctx) {
        const subCommand = ctx.options.getSubcommand();

        if (subCommand === 'add') {
            const apiKey = ctx.options.getString('key');

            /* Check if the key is valid */
            const userPelican = await ctx.pelican.isClientKeyValid(apiKey);
            if (!userPelican) return ctx.error('The API key you provided is not valid! Go on your profile page on the panel, search for \`Api Keys\` tab and create a new one. Then copy the key and paste it here.');

            /* Encrypt the key */
            const encryptedKey = ctx.pelican.encryption.encrypt(apiKey);

            /* Get the user from the database */
            const userDatabase = await ctx.database.table('users').select().where('discordId', ctx.user.id);

            if (!userDatabase[0]) {
                const usersPelican = await ctx.pelican.requestApplication("users").catch((err) => this.pelican.handlePelicanError(err, `users`));
                if (!usersPelican) return ctx.error('An error occurred while trying to get the users from Pelican!');

                const userAdminPelican = usersPelican.find(u => u.attributes.uuid === userPelican.attributes.uuid);
                if (!userAdminPelican) return ctx.error('This user is not in the panel Pelican!');

                /* Insert the user in the database */
                await ctx.database.table('users').insert({
                    discordId: ctx.user.id,
                    userPelicanId: userAdminPelican.attributes.id,
                    apiKey: encryptedKey
                });

                ctx.send({ content: `${ctx.emojiSuccess} Your API key has been added!` });
            }
            else {
                /* Update the user in the database */
                await ctx.database.table('users').update({
                    apiKey: encryptedKey
                }).where('discordId', ctx.user.id);

                if (!userDatabase[0].apiKey) return ctx.send({ content: `${ctx.emojiSuccess} Your API key has been added!` });
                ctx.send({ content: `${ctx.emojiSuccess} Your API key has been updated!` });
            }
        }
        else if (subCommand === "delete") {
            /* Get the user from the database */
            const userDatabase = await ctx.database.table('users').select().where('discordId', ctx.user.id);
            if (!userDatabase[0]) return ctx.error('You don\'t have an API key!');

            /* Delete the apiKey from the database */
            await ctx.database.table('users').update({
                apiKey: null
            }).where('discordId', ctx.user.id);

            ctx.send({ content: `${ctx.emojiSuccess} Your API key has been deleted!` });
        }
    }
}
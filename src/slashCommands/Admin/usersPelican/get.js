const SlashCommand = require('../../../managers/structures/SlashCommands.js');
const { MessageFlags, ContainerBuilder, SeparatorSpacingSize, ButtonBuilder } = require('discord.js');

module.exports = class UserGet extends SlashCommand {
    constructor(handler) {
        super(handler,{
            name: 'user-get',
            description: 'Get a specific user from the pelican panel',
            description_localizations: {
                "fr": "Obtenir un utilisateur spécifique du panel pelican"
            },
            options: [{
                name: 'pelican-user',
                description: 'Pelican user to get',
                description_localizations: {
                    "fr": "Utilisateur pelican à obtenir"
                },
                type: 3,
                required: true,
                autocomplete: true
            }],
            category: SlashCommand.Categories.UserPelican,
            user_permissions: ['Administrator'],
            bot_permissions: ['EmbedLinks']
        });
    }

    async run (ctx) {
        const userPelicanId = ctx.options.getString('pelican-user');

        try {
            const userPelican = await ctx.pelican.requestApplication(`users/${userPelicanId}?include=servers`);
            if (!userPelican) return ctx.error('This user does not exist!');

            /* Get user server's information */
            let totalResources = {
                memory: 0,
                disk: 0,
                cpu: 0,
                suspended: 0,
                databases: 0,
                backups: 0
            };

            for (const server of userPelican.attributes.relationships.servers.data) {
                totalResources.memory += server.attributes.limits.memory || 0;
                totalResources.disk += server.attributes.limits.disk || 0;
                totalResources.cpu += server.attributes.limits.cpu || 0;
                totalResources.suspended += server.attributes.suspended ? 1 : 0;
                totalResources.databases += server.attributes.feature_limits.databases || 0;
                totalResources.backups += server.attributes.feature_limits.backups || 0;
            }

            /* Get the discord user registered */
            let discordInfo = await ctx.database.table('users').first().where('userPelicanId', Number(userPelicanId));
            discordInfo = discordInfo ? `<@${discordInfo.discordId}> (\`${discordInfo.discordId}\`)` : '\`Not linked\`';

            const containerUser = new ContainerBuilder()
                .setAccentColor(ctx.me.displayColor)
                .addTextDisplayComponents(t => t.setContent(`# 👤 User account of ${userPelican.attributes.username}`))
                .addSeparatorComponents(s => s.setDivider(true).setSpacing(SeparatorSpacingSize.Large))
                .addTextDisplayComponents(
                    t => t.setContent([
                        "## 👤 User details",
                        `> 🪪 **Username:** ${this.utils.capitalize(userPelican.attributes.username)}`,
                        `> 🆔 **ID:** \`${userPelican.attributes.id}\``,
                        `> 📅 **Created at:** <t:${Math.round(new Date(userPelican.attributes.created_at).getTime()/ 1000).toFixed()}:d>`,
                        `> 💬 **Discord:** ${discordInfo}`,
                        `> 🛡️ **Administrator:** ${userPelican.attributes.root_admin ? `\`${ctx.emojiSuccess}\`` : `\`${ctx.emojiError}\``}`
                    ].join("\n")),
                    t => t.setContent([
                        "## 🖥️ Servers",
                        "",
                        `> 📦 **Total servers:** \`${userPelican.attributes.relationships.servers.data.length}\``,
                        `> ⛔ **Suspended servers :** \`${totalResources.suspended}\``,
                        `> 🗄️ **Databases:** \`${totalResources.databases}\``,
                        `> 💾 **Backups:** \`${totalResources.backups}\``,
                        `> ♾️ **Total CPU allocated:** \`${totalResources.cpu}%\``,
                        `> 🧠 **Total Memory allocated:** \`${ctx.utils.formatMegabytes(totalResources.memory)}\``,
                        `> 💽 **Total Disk allocated:** \`${ctx.utils.formatMegabytes(totalResources.disk)}\``
                    ].join("\n"))
                )
                .addSeparatorComponents(s => s.setDivider(true).setSpacing(SeparatorSpacingSize.Large))
                .addActionRowComponents(r => r.addComponents(
                    new ButtonBuilder()
                        .setStyle(5)
                        .setLabel('View on Pelican')
                        .setURL(`${ctx.config["pelican"]["url"].endsWith("/") ? ctx.config["pelican"]["url"].slice(0, -1) : ctx.config["pelican"]["url"]}/admin/users/${userPelican.attributes.id}/edit`)
                ))

            return ctx.send({ components: [containerUser], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
        } catch (err) {
            ctx.pelican.handlePelicanError(err, 'users');
            return ctx.error('An error occurred while trying to get the users from Pelican!');
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
            ctx.pelican.handlePelicanError(err, 'users');
        }
    }
}

const SlashCommand = require('../../managers/structures/SlashCommands.js');
const { MessageFlags, ContainerBuilder, SeparatorSpacingSize, ButtonBuilder } = require('discord.js');

module.exports = class Account extends SlashCommand {
    constructor(handler) {
        super(handler,{
            name: 'account',
            description: 'Get a details about your account',
            description_localizations: {
                "fr": "Obtenir des détails sur votre compte"
            },
            category: SlashCommand.Categories.UserPelican,
            bot_permissions: ['EmbedLinks']
        });
    }

    async run (ctx) {
        /* Get the user from the database */
        const userDatabase = await ctx.database.table('users').first().where('discordId', ctx.user.id);
        if (!userDatabase) {
            /* Get the slashCommands in the rest api */
            const applicationCommands = await ctx.guild.commands.fetch();

            /* Get link or apikey command */
            const ApiKeyCommand = applicationCommands.find((c) => c.name === 'api-key') ? `</api-key add:${applicationCommands.find((c) => c.name === 'api-key').id}>` : `\`api-key add\``;
            return ctx.error(`You don't have registered your api key yet! Please use ${ApiKeyCommand} to register it.`);
        }

        /* Get the user ID from Pelican */
        const userPelicanId = userDatabase.userPelicanId;

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
            const discordInfo = userDatabase ? `<@${userDatabase.discordId}> (\`${userDatabase.discordId}\`)` : '\`Not linked\`';

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
                        .setURL(`${ctx.config["pelican"]["url"].endsWith("/") ? ctx.config["pelican"]["url"].slice(0, -1) : ctx.config["pelican"]["url"]}/profile`)
                ))

            return ctx.send({ components: [containerUser], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
        } catch (err) {
            ctx.pelican.handlePelicanError(err, 'users');
            return ctx.error('An error occurred while trying to get the users from Pelican!');
        }
    }
}

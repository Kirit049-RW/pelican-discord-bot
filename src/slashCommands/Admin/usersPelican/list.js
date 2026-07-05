const SlashCommand = require('../../../managers/structures/SlashCommands.js');
const { MessageFlags, ContainerBuilder, SeparatorSpacingSize, ButtonBuilder } = require('discord.js');

module.exports = class UserList extends SlashCommand {
    constructor(handler) {
        super(handler,{
            name: 'user-list',
            description: 'Get all users from the pelican panel',
            description_localizations: {
                "fr": "Afficher tous les utilisateurs du panel pelican"
            },
            category: SlashCommand.Categories.UserPelican,
            user_permissions: ['Administrator'],
            bot_permissions: ['EmbedLinks']
        });
    }

    /**
     * Display the container to choose a user
     * @param ctx The command context
     * @param usersDatabase The users database
     * @param page The page
     * @param usersList The user's list
     * @param totalUsers The total number of users
     * @returns {ContainerBuilder}
     */
    displayContainer(ctx, usersDatabase, page, usersList, totalUsers) {
        /* Check if we have the discord user registered */
        const linkUsersToDiscord = usersList.map((user) => {
            const exist = usersDatabase.find((u) => u.userPelicanId === user.attributes.id)
            if (exist) return `<@${exist.discordId}> (\`${exist.discordId}\`)`
            else return '\`None\`'
        });

        const container = new ContainerBuilder()
            .setAccentColor(ctx.me.displayColor)
            .addSectionComponents(s => s
                .addTextDisplayComponents(t => t.setContent(`# 📜 Users account (${totalUsers})`))
                .addTextDisplayComponents(t => t.setContent(`> Select a user to see more information.`))
                .setThumbnailAccessory(t => t.setURL(ctx.me.displayAvatarURL()))
            )

            for (let i = 0; i < usersList.length; i++) {
                const user = usersList[i];

                container .addSeparatorComponents(s => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small))
                    .addSectionComponents(s => s
                        .addTextDisplayComponents(t =>
                            t.setContent(
                                [
                                    `## 👤 ${this.utils.capitalize(user.attributes.username)}`,
                                    `> **Discord:** ${linkUsersToDiscord[i]}`,
                                    `> **Administrator:** ${user.attributes.root_admin ? `\`${ctx.emojiSuccess}\`` : `\`${ctx.emojiError}\``}`
                                ].join("\n")
                            )
                        )
                        .setButtonAccessory(new ButtonBuilder()
                            .setCustomId(`user-${user.attributes.id}`)
                            .setStyle(2)
                            .setEmoji('ℹ️'))
                    )
            }

        return container;
    }

    async run (ctx) {
        /* Get all users registered in the database & on pelican */
        const usersDatabase = await ctx.database.table('users').select();

        const numberPerPage = 5;
        let page = 1;
        let msg;

        try {
            const usersPelican = await ctx.pelican.requestApplication("users?include=servers");

            /* Check if there is at least one user */
            if (!usersPelican[0]) return ctx.error('No user found on Pelican!');

            let usersList = ctx.utils.getNumberPacket(usersPelican, numberPerPage);
            const filter = (button) => button.user.id === ctx.user.id;

            let container = this.displayContainer(ctx, usersDatabase, page, usersList[page-1], usersPelican.length);

            if (usersList.length === 1) {
                msg = await ctx.send({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { parse: [] }
                });
            }
            else {
                const componentPage = ctx.messageFormatter.pages(`Page ${page}/${usersList.length}`, page, usersList.length);

                container
                    .addSeparatorComponents(s => s.setDivider(true).setSpacing(SeparatorSpacingSize.Large))
                    .addActionRowComponents(a => a.setComponents(componentPage[0].components))

                msg = await ctx.send({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { parse: [] }
                });

                const collector = msg.createMessageComponentCollector({ filter, idle: 5 * 60 * 1000, componentType: 2 });
                collector.on('collect', async (button) => {
                    if (!["left", "right"].includes(button.customId)) return
                    await button.deferUpdate();

                    button.customId === 'left' ? page-- : page++;

                    const componentPage = ctx.messageFormatter.pages(`Page ${page}/${usersList.length}`, page, usersList.length);

                    // Delete the component at setId 2 to avoid duplicates
                    container = this.displayContainer(ctx, usersDatabase, page, usersList[page-1], usersPelican.length);

                    container
                        .addSeparatorComponents(s => s.setDivider(true).setSpacing(SeparatorSpacingSize.Large))
                        .addActionRowComponents(a => a.setComponents(componentPage[0].components))

                    msg = await msg.edit({
                        components: [container],
                        allowedMentions: { parse: [] }
                    }).catch(() => null);
                });
            }

            const collectorButton = msg.createMessageComponentCollector({ filter, idle: 5 * 60 * 1000, componentType: 2});

            collectorButton.on('collect', async (button) => {
                if (!button.customId.startsWith('user-') && button.customId !== 'user-list') return;
                await button.deferUpdate();

                if (button.customId === 'user-list') return msg.edit({ components: [container], allowedMentions: { parse: [] } }).catch(() => null);

                /* Retrieve the user on pelican */
                const userPelicanId = button.customId.split('-')[1];
                const userPelican = usersPelican.find((u) => u.attributes.id === Number(userPelicanId));
                if (!userPelican) return button.followUp({ content: `${ctx.emojiError} This user does not exist on Pelican!`, flags: MessageFlags.Ephemeral });

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
                let discordInfo = usersDatabase.find((u) => u.userPelicanId === userPelican.attributes.id);
                discordInfo = discordInfo ? `<@${discordInfo.discordId}> (\`${discordInfo.discordId}\`)` : '\`Not linked\`';

                const buttonReturn = new ButtonBuilder()
                .setCustomId('user-list')
                    .setLabel('Return')
                    .setStyle(2)
                    .setEmoji('⬅️')

                const containerUser = new ContainerBuilder()
                    .setAccentColor(ctx.me.displayColor)
                    .addSectionComponents(s => s
                        .addTextDisplayComponents(t => t.setContent(`# 👤 User account of ${userPelican.attributes.username}`))
                        .setButtonAccessory(buttonReturn)
                    )
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

                return msg.edit({
                    components: [containerUser],
                    allowedMentions: { parse: [] }
                }).catch(() => null);
            });

            collectorButton.on('end', (_, reason) => {
                if (reason === 'idle') return msg.edit({ components: ctx.messageFormatter.disableButtons(msg.components, true), allowedMentions: { parse: [] } }).catch(() => null);
            });
        } catch (err) {
            ctx.pelican.handlePelicanError(err, 'users');
            return ctx.error('An error occurred while trying to get the users from Pelican!');
        }
    }
}

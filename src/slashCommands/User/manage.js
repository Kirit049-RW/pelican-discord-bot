const SlashCommand = require('../../managers/structures/SlashCommands.js');
const { MessageFlags, ContainerBuilder, SeparatorSpacingSize, ButtonBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, LabelBuilder, StringSelectMenuBuilder, CheckboxGroupBuilder, UserSelectMenuBuilder } = require('discord.js');

module.exports = class Manage extends SlashCommand {
    constructor(handler) {
        super(handler,{
            name: 'manage',
            description: 'Manage your servers',
            description_localizations: {
                "fr": "Gérer vos serveurs"
            },
            category: SlashCommand.Categories.UserPelican,
            bot_permissions: ['EmbedLinks']
        });
    }

    /**
     * Display the container to choose a user
     * @param ctx The command context
     * @param page The page
     * @param serversList The server's list
     * @param totalServers The total number of servers
     * @returns {ContainerBuilder}
     */
    displayContainer(ctx, page, serversList, totalServers) {
        const container = new ContainerBuilder()
            .setAccentColor(ctx.me.displayColor)
            .addSectionComponents(s => s
                .addTextDisplayComponents(t => t.setContent(`# 📜 Servers (${totalServers})`))
                .addTextDisplayComponents(t => t.setContent(`> Select a server to manage`))
                .setThumbnailAccessory(t => t.setURL(ctx.me.displayAvatarURL()))
            )

        for (let i = 0; i < serversList.length; i++) {
            const server = serversList[i];

            container .addSeparatorComponents(s => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small))
                .addSectionComponents(s => s
                    .addTextDisplayComponents(t =>
                        t.setContent(
                            [
                                `## ✳️ ${server.attributes.name}`,
                                `> **Description:** ${server.attributes.description || '\`None\`' }`,
                                `> **Owner:** \`${server.attributes.server_owner ? `${ctx.emojiSuccess}` : `${ctx.emojiError}`}\``
                            ].join("\n")
                        )
                    )
                    .setButtonAccessory(new ButtonBuilder()
                        .setCustomId(`server-${server.attributes.identifier}`)
                        .setStyle(2)
                        .setEmoji('ℹ️'))
                )
        }

        return container;
    }

    /**
     * Check if the user has the right permissions to perform an action on the server
     * @param server The server
     * @param type The type of action to perform
     * @return {boolean}
     */
    isMissingPermissions(server, type) {
        /* Check if the user is the owner of the server */
        if (server.attributes.server_owner) return false

        /* Get the user permissions */
        const user = server.meta.user_permissions;

        /* Check if the user has the right permissions */
        const permissionsByType = {
            power_actions: ["control.start", "control.stop", "control.restart"],
            subusers: ["user.create", "user.update", "user.delete"],
            databases: ["database.create", "database.delete"],
            backups: ["backup.create", "backup.delete"],
            settings: ["settings.rename", "settings.description"],
            reinstall: ["settings.reinstall"],
            console: ["control.console"]
        };

        const permissionsNeeded = permissionsByType[type];

        /* If the type is undefined, return true */
        if (!permissionsNeeded) return true;

        return !permissionsNeeded.every(permission => user.includes(permission));
    }

    /**
     * Display the server information
     * @param ctx The command context
     * @param server The server
     * @param serverMonitor The server monitor
     * @param apiKey The api key of the user
     * @param reinstall If the server is being reinstalled
     * @return {Promise<ContainerBuilder>}
     */
    async displayServer(ctx, server, serverMonitor, apiKey, reinstall = false) {
        /* Retrieve nodes from Pelican */
        const nodesPelican = await ctx.pelican.requestApplication(`nodes`).catch((err) => ctx.pelican.handlePelicanError(err, `nodes`));
        const nodePelican = nodesPelican.find((n) => n.attributes.name === server.attributes.node);

        /* Retrieve logs of the server */
        let wingsLogs = null;
        if (nodePelican && !this.isMissingPermissions(server, 'console')) {
            /* Retrieve the node config from Pelican */
            const nodeConfigPelican = await ctx.pelican.requestApplication(`nodes/${nodePelican.attributes.id}/configuration`).catch((err) => ctx.pelican.handlePelicanError(err, `nodes/${nodePelican.attributes.id}/configuration`));

            wingsLogs = await ctx.pelican.requestWings(`servers/${server.attributes.uuid}/logs?size=10`, nodePelican, nodeConfigPelican.token).catch((err) => ctx.pelican.handlePelicanError(err, `servers/${server.attributes.uuid}/logs?size=10`));
        }

        /* Retrieve the databases from Pelican */
        let databasesPelican;
        if (!this.isMissingPermissions(server, 'databases')) {
            databasesPelican = await ctx.pelican.requestClient(`servers/${server.attributes.identifier}/databases`, apiKey).catch((err) => ctx.pelican.handlePelicanError(err, `servers/${server.attributes.identifier}/databases`));
        }

        /* Retrieve the backups from Pelican */
        let backupsPelican;
        if (!this.isMissingPermissions(server, 'backups')) {
            backupsPelican = await ctx.pelican.requestClient(`servers/${server.attributes.identifier}/backups`, apiKey).catch((err) => ctx.pelican.handlePelicanError(err, `servers/${server.attributes.identifier}/backups`));
        }

        /* Retrieve the resources from Pelican */
        let resourcesPelican;
        const resources = {
            memory: 0,
            disk: 0,
            cpu: 0,
            network_rx: 0,
            network_tx: 0,
            uptime: 0
        }
        if (!server.attributes.is_suspended) {
            resourcesPelican = await ctx.pelican.requestClient(`servers/${server.attributes.identifier}/resources`, apiKey).catch((err) => ctx.pelican.handlePelicanError(err, `servers/${server.attributes.identifier}/resources`));

            if (resourcesPelican.attributes.current_state === 'running') {
                resources.memory = resourcesPelican.attributes.resources.memory_bytes;
                resources.disk = resourcesPelican.attributes.resources.disk_bytes;
                resources.cpu = resourcesPelican.attributes.resources.cpu_absolute;
                resources.network_rx = resourcesPelican.attributes.resources.network_rx_bytes;
                resources.network_tx = resourcesPelican.attributes.resources.network_tx_bytes;
                resources.uptime = resourcesPelican.attributes.resources.uptime;
            }
        }

        /* Format subusers */
        const subUsers = server.attributes.relationships.subusers.data
            ?.map(({ attributes }) =>
                `\u001b[1;34m${ctx.utils.capitalize(attributes.username)}\u001b[0m ➜ \u001b[1;31m${
                    attributes.permissions
                        .filter(permission => !permission.startsWith('websocket.'))
                        .map(p => p)
                        .join(', ')
                }\u001b[0m`
            )
            .join('\n');

        const subUsersDisplay = subUsers
            ? `\n\`\`\`ansi\n${subUsers}\n\`\`\``
            : ` \`${ctx.emojiError}\``;

        const buttonReturn = new ButtonBuilder()
            .setCustomId('server-list')
            .setLabel('Return')
            .setStyle(2)
            .setEmoji('⬅️')

        const selectMenuPowerAction = new StringSelectMenuBuilder()
            .setCustomId(`power_actions-${server.attributes.identifier}`)
            .setPlaceholder('List of power actions')
            .setMinValues(1)
            .setMaxValues(1)
            .setDisabled(this.isMissingPermissions(server, 'power_actions') || server.attributes.is_suspended)
            .addOptions([
                {
                    label: 'Start',
                    description: 'Start the server',
                    value: 'start',
                    emoji: "▶️"
                },
                {
                    label: 'Stop',
                    description: 'Stop the server',
                    value: 'stop',
                    emoji: "⏹️"
                },
                {
                    label: 'Restart',
                    description: 'Restart the server',
                    value: 'restart',
                    emoji: "🔄"
                },
                {
                    label: 'Kill',
                    description: 'Kill the server',
                    value: 'kill',
                    emoji: "💀"
                }
            ])

        const container = new ContainerBuilder()
            .setAccentColor(ctx.utils.embedColorFromStatus(resourcesPelican?.attributes?.current_state))
            .addSectionComponents(s => s
                .addTextDisplayComponents(t => t.setContent(`# ✳️ Server ${server.attributes.name}`))
                .setButtonAccessory(buttonReturn)
            )
            .addSeparatorComponents(s => s.setDivider(true).setSpacing(SeparatorSpacingSize.Large))
            .addSectionComponents(s => s
                .addTextDisplayComponents(t => t.setContent(
                    [
                        "## 👤 Server details",
                        `> ✏️ **Name:** ${server.attributes.name}`,
                        `> 💬 **Description:** ${server.attributes.description ? server.attributes.description : '\`-\`'}`,
                        `> 🆔 **ID:** \`${server.attributes.identifier}\``,
                        `> 🪪 **Owner:** \`${server.attributes.server_owner ? `${ctx.emojiSuccess}` : `${ctx.emojiError}`}\``,
                        `> ⛔ **Suspended:** \`${server.attributes.is_suspended ? ctx.emojiSuccess : ctx.emojiError}\``,
                        `> 🕙 **Uptime:** ${resources.uptime > 0 ? `<t:${(Math.floor((Date.now() - resources.uptime) / 1000)).toFixed()}:R>` : '\`-\`'}`,
                        !this.isMissingPermissions(server, 'files') ? `> 🔗 **SFTP Host:** \`${server.attributes.sftp_details.alias}\`` : null,
                        !this.isMissingPermissions(server, 'files') ? `> 📂 **SFTP Port:** \`${server.attributes.sftp_details.port}\`` : null
                    ].filter(i => i).join("\n"))
                )
                .setButtonAccessory(new ButtonBuilder()
                    .setCustomId(`details-${server.attributes.identifier}`)
                    .setLabel('Update details')
                    .setEmoji('👤')
                    .setStyle(2)
                    .setDisabled(this.isMissingPermissions(server, 'settings') || server.attributes.is_suspended)
                )
            )
            .addTextDisplayComponents(t => t.setContent(
                [
                    "## ✳️ Server features",
                    `> 📟 **Node:** ${server.attributes.node}`,
                    `> 🥚 **Egg:** ${server.attributes.relationships.egg.attributes.name}`,
                    databasesPelican ? `> 🗄️ **Database:** \`${server.attributes.feature_limits.databases === 0 ? '-' : `${databasesPelican.length}/${server.attributes.feature_limits.databases}`}\`` : null,
                    backupsPelican ? `> 💾 **Backup:** \`${server.attributes.feature_limits.backups === 0 ? '-' : `${backupsPelican.length}/${server.attributes.feature_limits.backups}`}\`` : null,
                    `> 🌐 **Allocation:** \`${server.attributes.feature_limits.allocations === 0 ? '-' : `${server.attributes.relationships.allocations.data.length}/${server.attributes.feature_limits.allocations}`}\``,
                    subUsers ? `> 👥 **Sub Users:**${subUsersDisplay}` : null
                ].filter(i => i).join("\n"))
            )
            .addTextDisplayComponents(t => t.setContent(
                [
                    "## ⚙️ Server limits",
                    `> ♾️ **CPU:** \`${resources.cpu.toFixed(2)}/${server.attributes.limits.cpu}%\``,
                    `> 🧠 **Memory:** \`${this.utils.formatBytes(resources.memory)}/${this.utils.formatMegabytes(server.attributes.limits.memory)}\``,
                    `> 💽 **Disk:** \`${this.utils.formatBytes(resources.disk)}/${this.utils.formatMegabytes(server.attributes.limits.disk)}\``,
                    `> ⬆️ **Upload:** \`${this.utils.formatBytes(resources.network_tx)}\``,
                    `> ⬇️ **Download:** \`${this.utils.formatBytes(resources.network_rx)}\``
                ].join("\n"))
            )

        if (!this.isMissingPermissions(server, 'console') && wingsLogs && Array.isArray(wingsLogs)) {
            container.addTextDisplayComponents(t => t.setContent(
                [
                    "## 📝 Logs",
                    `\`\`\`ansi\n${wingsLogs.join('\n')}\`\`\``
                ].join("\n"))
            )
        }

        container
            .addSeparatorComponents(s => s.setDivider(true).setSpacing(SeparatorSpacingSize.Large))
            .addTextDisplayComponents(t => t.setContent("## ⚡ Power Actions"))
            .addActionRowComponents(r => r.addComponents(selectMenuPowerAction))
            .addSeparatorComponents(s => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addTextDisplayComponents(t => t.setContent("## 👥 Users"))
            .addActionRowComponents(r => r.addComponents(
                new ButtonBuilder()
                    .setCustomId(`add_subuser-${server.attributes.identifier}`)
                    .setLabel('Add / Edit subuser')
                    .setStyle(3)
                    .setEmoji('👤')
                    .setDisabled(this.isMissingPermissions(server, 'subusers') || server.attributes.is_suspended),
                new ButtonBuilder()
                    .setCustomId(`delete_subuser-${server.attributes.identifier}`)
                    .setLabel('Delete subuser')
                    .setStyle(4)
                    .setEmoji('👤')
                    .setDisabled(subUsers && subUsers.length === 0 || this.isMissingPermissions(server, 'subusers') || server.attributes.is_suspended)
            ))
            .addSeparatorComponents(s => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addTextDisplayComponents(t => t.setContent("## 👥🗄️ Databases & Backups"))
            .addActionRowComponents(r => r.addComponents(
                new ButtonBuilder()
                    .setCustomId(`create_database-${server.attributes.identifier}`)
                    .setLabel('Create database')
                    .setEmoji('🗄️')
                    .setStyle(3)
                    .setDisabled(server.attributes.feature_limits.databases === 0 || databasesPelican && databasesPelican.length >= server.attributes.feature_limits.databases || this.isMissingPermissions(server, 'databases') || server.attributes.is_suspended),
                new ButtonBuilder()
                    .setCustomId(`create_backup-${server.attributes.identifier}`)
                    .setLabel('Create backup')
                    .setEmoji('💾')
                    .setStyle(3)
                    .setDisabled(server.attributes.feature_limits.backups === 0 || backupsPelican && backupsPelican.length >= server.attributes.feature_limits.backups || this.isMissingPermissions(server, 'backups') || server.attributes.is_suspended)
            ))
            .addActionRowComponents(r => r.addComponents(
                new ButtonBuilder()
                    .setCustomId(`delete_database-${server.attributes.identifier}`)
                    .setLabel('Delete database')
                    .setEmoji('🗄️')
                    .setStyle(4)
                    .setDisabled(databasesPelican && databasesPelican.length === 0 || this.isMissingPermissions(server, 'databases') || server.attributes.is_suspended),
                new ButtonBuilder()
                    .setCustomId(`delete_backup-${server.attributes.identifier}`)
                    .setLabel('Delete backup')
                    .setEmoji('💾')
                    .setStyle(4)
                    .setDisabled(backupsPelican && backupsPelican.length === 0 || this.isMissingPermissions(server, 'backups') || server.attributes.is_suspended)
            ))
            .addSeparatorComponents(s => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addTextDisplayComponents(t => t.setContent("## 🛠️ Server"))
            .addActionRowComponents(r => r.addComponents(
                new ButtonBuilder()
                    .setCustomId(`reinstall-${server.attributes.identifier}`)
                    .setLabel('Reinstall')
                    .setEmoji('🔄')
                    .setStyle(1)
                    .setDisabled(reinstall || this.isMissingPermissions(server, 'reinstall') || server.attributes.is_suspended),
                new ButtonBuilder()
                    .setStyle(5)
                    .setLabel('View on Pelican')
                    .setURL(`${ctx.config["pelican"]["url"].endsWith("/") ? ctx.config["pelican"]["url"].slice(0, -1) : ctx.config["pelican"]["url"]}/server/${server.attributes.identifier}`)
            ));

        if (server.attributes.server_owner) {
            const usersId = serverMonitor ? Array.isArray(serverMonitor) ? serverMonitor : JSON.parse(serverMonitor.usersId) : [];
            const hasOwner = usersId.includes(ctx.user.id);
            const subusersMonitor = usersId.filter(id => !ctx.user.id.includes(id));

            container
                .addSeparatorComponents(s => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small))
                .addTextDisplayComponents(t => t.setContent(`## 🔔 Monitor\n> 🪪 **Owner:** ${hasOwner ? `\`${ctx.emojiSuccess}\`` : `\`${ctx.emojiError}\`` }\n> 👥 **Subusers:** ${subusersMonitor.length > 0 ? subusersMonitor.map(
                    s => ctx.getMember(s) || `\`${s}\``
                ) : `\`${ctx.emojiError}\`` }`))
                .addActionRowComponents(r => r.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`add_monitor-${server.attributes.identifier}`)
                        .setLabel('Add / Edit monitor')
                        .setEmoji('🔔')
                        .setStyle(3),
                    new ButtonBuilder()
                        .setCustomId(`delete_monitor-${server.attributes.identifier}`)
                        .setLabel('Delete monitor')
                        .setEmoji('🔕')
                        .setStyle(4)
                        .setDisabled(usersId.length === 0)
                ));

        }

        return container;
    }

    async run (ctx) {
        /* Get all users registered in the database & on pelican */
        const userDatabase = await ctx.database.table('users').first().where('discordId', ctx.user.id);
        if (!userDatabase || !userDatabase.apiKey) {
            /* Get the slashCommands in the rest api */
            const applicationCommands = await ctx.guild.commands.fetch();

            /* Get link or apikey command */
            const ApiKeyCommand = applicationCommands.find((c) => c.name === 'api-key') ? `</api-key add:${applicationCommands.find((c) => c.name === 'api-key').id}>` : `\`api-key add\``;
            return ctx.error(`You don't have registered your api key yet! Please use ${ApiKeyCommand} to register it.`);
        }

        const numberPerPage = 5;
        let page = 1;
        let msg;

        try {
            let serversPelican = await ctx.pelican.requestClient("", userDatabase.apiKey);

            /* Check if there is at least one user */
            if (!serversPelican[0]) return ctx.error('You don\'t have any servers on Pelican!');

            let serversList = ctx.utils.getNumberPacket(serversPelican, numberPerPage);
            const filter = (button) => button.user.id === ctx.user.id;

            let container = this.displayContainer(ctx, page, serversList[page-1], serversPelican.length);

            if (serversList.length === 1) {
                msg = await ctx.send({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });
            }
            else {
                const componentPage = ctx.messageFormatter.pages(`Page ${page}/${serversList.length}`, page, serversList.length);

                container
                    .addSeparatorComponents(s => s.setDivider(true).setSpacing(SeparatorSpacingSize.Large))
                    .addActionRowComponents(a => a.setComponents(componentPage[0].components))

                msg = await ctx.send({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });

                const collector = msg.createMessageComponentCollector({ filter, idle: 5 * 60 * 1000, componentType: 2 });
                collector.on('collect', async (button) => {
                    if (!["left", "right"].includes(button.customId)) return
                    await button.deferUpdate();

                    button.customId === 'left' ? page-- : page++;

                    const componentPage = ctx.messageFormatter.pages(`Page ${page}/${serversList.length}`, page, serversList.length);

                    // Delete the component at setId 2 to avoid duplicates
                    container = this.displayContainer(ctx, page, serversList[page-1], serversPelican.length);

                    container
                        .addSeparatorComponents(s => s.setDivider(true).setSpacing(SeparatorSpacingSize.Large))
                        .addActionRowComponents(a => a.setComponents(componentPage[0].components))

                    msg = await msg.edit({
                        components: [container]
                    }).catch(() => null);
                });
            }

            const collectorButton = msg.createMessageComponentCollector({ filter, idle: 5 * 60 * 1000, componentType: 2});
            const collectorMenu = msg.createMessageComponentCollector({ filter, idle: 5 * 60 * 1000, componentType: 3});

            collectorMenu.on('collect', async (menu) => {
                /* Retrieve the user on pelican */
                const serverPelicanId = menu.customId.split('-')[1];
                let serverPelican = await ctx.pelican.requestClient(`servers/${serverPelicanId}?include=egg,subusers`, userDatabase.apiKey).catch((err) => ctx.pelican.handlePelicanError(err, `servers/${serverPelicanId}?include=egg,subusers`));
                if (!serverPelican) return menu.reply({ content: `${ctx.emojiError} This server does not exist on Pelican!`, flags: MessageFlags.Ephemeral });

                /* Get the server monitoring in database */
                const serverMonitor = await ctx.database.table('monitoring_servers').first().where({ serverId: serverPelicanId });

                if (menu.customId.startsWith('power_actions')) {
                    await menu.deferUpdate();

                    // Get the power action
                    const powerAction = menu.values[0];

                    /* Retrieve the resources from Pelican */
                    const resourcesPelican = await ctx.pelican.requestClient(`servers/${serverPelicanId}/resources`, userDatabase.apiKey).catch((err) => ctx.pelican.handlePelicanError(err, `servers/${serverPelicanId}/resources`));

                    /* Check the status of the server */
                    if (powerAction === 'start' && resourcesPelican.attributes.current_state !== 'offline') return menu.followUp({
                        content: `${ctx.emojiError} The server is currently running!`,
                        flags: MessageFlags.Ephemeral
                    })
                    else if (['stop', 'kill'].includes(powerAction) && resourcesPelican.attributes.current_state === 'offline') return menu.followUp({
                        content: `${ctx.emojiError} The server is currently offline!`,
                        flags: MessageFlags.Ephemeral
                    })

                    /* Start the server */
                    await ctx.pelican.requestClient(`servers/${serverPelicanId}/power`, userDatabase.apiKey, 'post', true, {
                        signal: menu.values[0]
                    }).catch((err) => ctx.pelican.handlePelicanError(err, `servers/${serverPelicanId}/power`, 'post'));

                    if (['start', 'restart'].includes(powerAction)) {
                        /* Send a success message */
                        const msgStatus = await menu.followUp({
                            content: `:clock10: The server is being **${menu.values[0]}ed**, this may take a few seconds...`,
                            flags: MessageFlags.Ephemeral
                        });

                        let isStarted = false;
                        while (!isStarted) {
                            /* Check the status of the server */
                            const status = await ctx.pelican.requestClient(`servers/${serverPelicanId}/resources`, userDatabase.apiKey).catch((err) => ctx.pelican.handlePelicanError(err, `servers/${serverPelicanId}/resources`));
                            if (status.attributes.current_state === 'running') isStarted = true;

                            /* Wait 2 seconds before re check */
                            await ctx.utils.sleep(2 * 1000);
                        }

                        /* Delete the reply*/
                        await menu.deleteReply(msgStatus.id).catch(() => null);
                    }

                    // Fetch the server again
                    serverPelican = await ctx.pelican.requestClient(`servers/${serverPelicanId}?include=egg,subusers`, userDatabase.apiKey).catch((err) => ctx.pelican.handlePelicanError(err, `servers/${serverPelicanId}?include=egg,subusers`));

                    /* Send success message */
                    await menu.followUp({
                        content: `${ctx.emojiSuccess} The server is **${menu.values[0]}ed**!`,
                        flags: MessageFlags.Ephemeral
                    });

                    // Update the message
                    msg = await menu.message.edit({
                        components: [await this.displayServer(ctx, serverPelican, serverMonitor, userDatabase.apiKey)]
                    }).catch(() => null);
                }
            });

            collectorButton.on('collect', async (button) => {
                if (["left", "right"].includes(button.customId)) return

                if (button.customId === 'server-list') {
                    await button.deferUpdate();
                    msg = await button.message.edit({ components: [container] }).catch(() => null);
                    return;
                }

                /* Retrieve the user on pelican */
                const serverPelicanId = button.customId.split('-')[1];
                let serverPelican = await ctx.pelican.requestClient(`servers/${serverPelicanId}?include=egg,subusers`, userDatabase.apiKey).catch((err) => ctx.pelican.handlePelicanError(err, `servers/${serverPelicanId}?include=egg,subusers`));
                if (!serverPelican) return button.reply({ content: `${ctx.emojiError} This server does not exist on Pelican!`, flags: MessageFlags.Ephemeral });

                /* Check if the server is currently installing */
                if (serverPelican.attributes.is_installing) return button.reply({
                    content: `${ctx.emojiError} The server is currently installing, please wait the end of the installation and try again!`,
                    flags: MessageFlags.Ephemeral
                });

                /* Check if the server is currently transferring */
                else if (serverPelican.attributes.is_transferring) return button.reply({
                    content: `${ctx.emojiError} The server is currently transferring, please wait the end of the transfer and try again!`,
                    flags: MessageFlags.Ephemeral
                });

                /* Get the server monitoring in database */
                const serverMonitor = await ctx.database.table('monitoring_servers').first().where({ serverId: serverPelicanId });

                if (button.customId.startsWith('reinstall-')) {
                    await button.deferUpdate();

                    // Disable buttons
                    await msg.edit({
                        components: ctx.messageFormatter.disableButtons(button.message.components, true)
                    }).catch(() => null);

                    /* Ask for confirmation */
                    const embedAsk = new EmbedBuilder()
                        .setDescription(`**Are you sure you want to reinstall the server ${serverPelican.attributes.name}?**`)
                        .setColor(ctx.me.displayColor)

                    const msgAsk = await ctx.send({
                        embeds: [embedAsk],
                        components: ctx.messageFormatter.question()
                    });

                    const collectorAsk = msgAsk.createMessageComponentCollector({ filter, idle: 5 * 60 * 1000, componentType: 2, max: 1 });
                    collectorAsk.on('collect', async (buttonConfirm) => {
                        await buttonConfirm.deferUpdate();
                        msgAsk.delete().catch(() => null);
                        collectorAsk.stop();

                        // If the user cancels the confirmation
                        if (buttonConfirm.customId !== 'yes') msg = await button.message.edit({
                            components: [await this.displayServer(ctx, serverPelican, serverMonitor, userDatabase.apiKey)]
                        }).catch(() => null);

                        await ctx.pelican.requestClient(`servers/${serverPelicanId}/settings/reinstall`, userDatabase.apiKey, 'post').catch((err) => ctx.pelican.handlePelicanError(err, `servers/${serverPelicanId}/settings/reinstall`));

                        button.followUp({ content: `${ctx.emojiSuccess} The server is being reinstalled!` });
                        msg = await button.message.edit({
                            components: [await this.displayServer(ctx, serverPelican, serverMonitor, userDatabase.apiKey, true)]
                        }).catch(() => null);
                    });
                }
                else if (button.customId.startsWith('create_database-')) {
                    /* Retrieve the databases from Pelican */
                    const databasesPelican = await ctx.pelican.requestClient(`servers/${serverPelicanId}/databases`, userDatabase.apiKey).catch((err) => ctx.pelican.handlePelicanError(err, `servers/${serverPelicanId}/databases`));

                    /* Check if the limit is not reached */
                    if (databasesPelican.length >= serverPelican.attributes.feature_limits.databases) return button.reply({
                        content: `${ctx.emojiError} The limit of databases has been reached!`,
                        flags: MessageFlags.Ephemeral
                    });

                    const date = Date.now();
                    const modal = new ModalBuilder()
                        .setCustomId(`create_database_${date}`)
                        .setTitle(`Create database`)

                    const textInputDatabase = new TextInputBuilder()
                        .setCustomId('database_name')
                        .setStyle(2)
                        .setRequired(true)
                        .setMaxLength(48)
                        .setMinLength(1)

                    const labelDatabase = new LabelBuilder()
                        .setLabel(`Database name:`)
                        .setTextInputComponent(textInputDatabase)

                    modal.addLabelComponents(labelDatabase)

                    button.showModal(modal);

                    const filter = (modal) => modal.customId === `create_database_${date}`;
                    button.awaitModalSubmit({ filter, time : 5 * 60 * 1000 })
                        .catch(() => null)
                        .then(async (modal) => {
                            if (modal === undefined || modal === null) return
                            await modal.deferUpdate().catch(() => null);

                            const databaseName = modal.fields.getTextInputValue('database_name');

                            const database = await ctx.pelican.requestClient(`servers/${serverPelicanId}/databases`, userDatabase.apiKey, 'post', true, {
                                database: databaseName,
                                remote: "%"
                            }).catch((err) => ctx.pelican.handlePelicanError(err, `servers/${serverPelicanId}/databases`, 'post'));

                            if (!database) {
                                return modal.followUp({
                                    content: `${ctx.emojiError} An error occurred while creating the database!`,
                                    flags: MessageFlags.Ephemeral
                                });
                            }

                            // Fetch the server again
                            serverPelican = await ctx.pelican.requestClient(`servers/${serverPelicanId}?include=egg,subusers`, userDatabase.apiKey).catch((err) => ctx.pelican.handlePelicanError(err, `servers/${serverPelicanId}?include=egg,subusers`));

                            /* Send success message */
                            await modal.followUp({
                                content: `${ctx.emojiSuccess} The database \`${database.attributes.name}\` has been created!`,
                                flags: MessageFlags.Ephemeral
                            });

                            // Update the message
                            msg = await button.message.edit({
                                components: [await this.displayServer(ctx, serverPelican, serverMonitor, userDatabase.apiKey)]
                            }).catch(() => null);
                        });
                }
                else if (button.customId.startsWith('delete_database-')) {
                    /* Retrieve the databases from Pelican */
                    const databasesPelican = await ctx.pelican.requestClient(`servers/${serverPelicanId}/databases`, userDatabase.apiKey).catch((err) => ctx.pelican.handlePelicanError(err, `servers/${serverPelicanId}/databases`));

                    /* Check if database exists */
                    if (databasesPelican.length === 0) return button.reply({
                        content: `${ctx.emojiError} No database found on this server!`,
                        flags: MessageFlags.Ephemeral
                    });

                    const date = Date.now();
                    const modal = new ModalBuilder()
                        .setCustomId(`delete_database_${date}`)
                        .setTitle(`Delete database`)

                    const selectInputDatabase = new StringSelectMenuBuilder()
                        .setCustomId('database_value')
                        .setRequired(true)
                        .setPlaceholder('Select a database')
                        .setMinValues(1)
                        .setMaxValues(1)

                    if (databasesPelican[0]) {
                        selectInputDatabase.addOptions(databasesPelican.slice(0, 25)
                            .map((database) => {
                                return {
                                    label: database.attributes.name.length > 100 ? this.utils.capitalize(`${database.attributes.name.slice(0, 95)} ...`) : this.utils.capitalize(database.attributes.name),
                                    value: String(database.attributes.id)
                                }
                            })
                        )
                    }
                    else {
                        selectInputDatabase.setDisabled(true);
                        selectInputDatabase.setPlaceholder('No database found for this server!');
                    }

                    const labelDatabase = new LabelBuilder()
                        .setLabel(`Database name:`)
                        .setStringSelectMenuComponent(selectInputDatabase)

                    modal.addLabelComponents(labelDatabase)

                    button.showModal(modal);

                    const filter = (modal) => modal.customId === `delete_database_${date}`;
                    button.awaitModalSubmit({ filter, time : 5 * 60 * 1000 })
                        .catch(() => null)
                        .then(async (modal) => {
                            if (modal === undefined || modal === null) return
                            await modal.deferUpdate().catch(() => null);

                            const databaseId = modal.fields.getStringSelectValues('database_value')[0];

                            await ctx.pelican.requestClient(`servers/${serverPelicanId}/databases/${databaseId}`, userDatabase.apiKey, 'delete', ).catch((err) => ctx.pelican.handlePelicanError(err, `servers/${serverPelicanId}/databases/${databaseId}`, 'delete'));

                            // Fetch the server again
                            serverPelican = await ctx.pelican.requestClient(`servers/${serverPelicanId}?include=egg,subusers`, userDatabase.apiKey).catch((err) => ctx.pelican.handlePelicanError(err, `servers/${serverPelicanId}?include=egg,subusers`));

                            /* Send success message */
                            await modal.followUp({
                                content: `${ctx.emojiSuccess} The database has been deleted!`,
                                flags: MessageFlags.Ephemeral
                            });

                            // Update the message
                            msg = await button.message.edit({
                                components: [await this.displayServer(ctx, serverPelican, serverMonitor, userDatabase.apiKey)]
                            }).catch(() => null);
                        });
                }
                else if (button.customId.startsWith('create_backup-')) {
                    /* Retrieve the backups from Pelican */
                    const backupsPelican = await ctx.pelican.requestClient(`servers/${serverPelicanId}/backups`, userDatabase.apiKey).catch((err) => ctx.pelican.handlePelicanError(err, `servers/${serverPelicanId}/backups`));

                    /* Check if the limit is not reached */
                    if (backupsPelican.length >= serverPelican.attributes.feature_limits.backups) return button.reply({
                        content: `${ctx.emojiError} The limit of backups has been reached!`,
                        flags: MessageFlags.Ephemeral
                    });

                    const date = Date.now();
                    const modal = new ModalBuilder()
                        .setCustomId(`create_backup_${date}`)
                        .setTitle(`Create backup`)

                    const textInputBackup = new TextInputBuilder()
                        .setCustomId('backup_name')
                        .setStyle(2)
                        .setRequired(true)
                        .setMaxLength(255)
                        .setMinLength(1)

                    const labelBackup = new LabelBuilder()
                        .setLabel(`Backup name:`)
                        .setTextInputComponent(textInputBackup)

                    modal.addLabelComponents(labelBackup)

                    button.showModal(modal);

                    const filter = (modal) => modal.customId === `create_backup_${date}`;
                    button.awaitModalSubmit({ filter, time : 5 * 60 * 1000 })
                        .catch(() => null)
                        .then(async (modal) => {
                            if (modal === undefined || modal === null) return
                            await modal.deferUpdate().catch(() => null);

                            const backupName = modal.fields.getTextInputValue('backup_name');

                            const backup = await ctx.pelican.requestClient(`servers/${serverPelicanId}/backups`, userDatabase.apiKey, 'post', true, {
                                name: backupName,
                                is_locked: false
                            }).catch((err) => ctx.pelican.handlePelicanError(err, `servers/${serverPelicanId}/backups`, 'post'));

                            if (!backup) {
                                return modal.followUp({
                                    content: `${ctx.emojiError} An error occurred while creating the backup file!`,
                                    flags: MessageFlags.Ephemeral
                                });
                            }

                            // Fetch the server again
                            serverPelican = await ctx.pelican.requestClient(`servers/${serverPelicanId}?include=egg,subusers`, userDatabase.apiKey).catch((err) => ctx.pelican.handlePelicanError(err, `servers/${serverPelicanId}?include=egg,subusers`));

                            /* Send success message */
                            await modal.followUp({
                                content: `${ctx.emojiSuccess} The backup \`${backup.attributes.name}\` has been created!`,
                                flags: MessageFlags.Ephemeral
                            });

                            // Update the message
                            msg = await button.message.edit({
                                components: [await this.displayServer(ctx, serverPelican, serverMonitor, userDatabase.apiKey)]
                            }).catch(() => null);
                        });
                }
                else if (button.customId.startsWith('delete_backup-')) {
                    /* Retrieve the backups from Pelican */
                    const backupsPelican = await ctx.pelican.requestClient(`servers/${serverPelicanId}/backups`, userDatabase.apiKey).catch((err) => ctx.pelican.handlePelicanError(err, `servers/${serverPelicanId}/backups`));

                    /* Check if database exists */
                    if (backupsPelican.length === 0) return button.reply({
                        content: `${ctx.emojiError} No backup found on this server!`,
                        flags: MessageFlags.Ephemeral
                    });

                    const date = Date.now();
                    const modal = new ModalBuilder()
                        .setCustomId(`delete_backup_${date}`)
                        .setTitle(`Delete backup`)

                    const selectInputBackup = new StringSelectMenuBuilder()
                        .setCustomId('backup_value')
                        .setRequired(true)
                        .setPlaceholder('Select a backup')
                        .setMinValues(1)
                        .setMaxValues(1)

                    if (backupsPelican[0]) {
                        selectInputBackup.addOptions(backupsPelican.slice(0, 25)
                            .map((database) => {
                                return {
                                    label: database.attributes.name.length > 100 ? this.utils.capitalize(`${database.attributes.name.slice(0, 95)} ...`) : this.utils.capitalize(database.attributes.name),
                                    value: String(database.attributes.uuid)
                                }
                            })
                        )
                    }
                    else {
                        selectInputBackup.setDisabled(true);
                        selectInputBackup.setPlaceholder('No backup found for this server!');
                    }

                    const labelBackup = new LabelBuilder()
                        .setLabel(`Backup name:`)
                        .setStringSelectMenuComponent(selectInputBackup)

                    modal.addLabelComponents(labelBackup)

                    button.showModal(modal);

                    const filter = (modal) => modal.customId === `delete_backup_${date}`;
                    button.awaitModalSubmit({ filter, time : 5 * 60 * 1000 })
                        .catch(() => null)
                        .then(async (modal) => {
                            if (modal === undefined || modal === null) return
                            await modal.deferUpdate().catch(() => null);

                            const backupId = modal.fields.getStringSelectValues('backup_value')[0];

                            await ctx.pelican.requestClient(`servers/${serverPelicanId}/backups/${backupId}`, userDatabase.apiKey, 'delete', ).catch((err) => ctx.pelican.handlePelicanError(err, `servers/${serverPelicanId}/databases/${backupId}`, 'delete'));

                            // Fetch the server again
                            serverPelican = await ctx.pelican.requestClient(`servers/${serverPelicanId}?include=egg,subusers`, userDatabase.apiKey).catch((err) => ctx.pelican.handlePelicanError(err, `servers/${serverPelicanId}?include=egg,subusers`));

                            /* Send success message */
                            await modal.followUp({
                                content: `${ctx.emojiSuccess} The backup has been deleted!`,
                                flags: MessageFlags.Ephemeral
                            });

                            // Update the message
                            msg = await button.message.edit({
                                components: [await this.displayServer(ctx, serverPelican, serverMonitor, userDatabase.apiKey)]
                            }).catch(() => null);
                        });
                }
                else if (button.customId.startsWith('add_subuser-')) {
                    const listPermissions = await ctx.pelican.requestClient(`permissions`, userDatabase.apiKey).catch((err) => ctx.pelican.handlePelicanError(err, `permissions`));
                    if (!listPermissions) return button.reply({ content: `${ctx.emojiError} An error occurred while fetching the permissions!`, flags: MessageFlags.Ephemeral });

                    const date = Date.now();
                    const modal = new ModalBuilder()
                        .setTitle('Add a subuser')
                        .setCustomId(`add_user_${date}`)

                    const inputEmail = new TextInputBuilder()
                        .setCustomId(`email_value`)
                        .setStyle(1)
                        .setRequired(true)

                    const checkBoxGroupPermissions = new CheckboxGroupBuilder()
                        .setCustomId(`permissions__value`)
                        .setRequired(true)
                        .setMinValues(1)
                        .setMaxValues(10)
                        .addOptions({
                            label: "All permissions",
                            description: "Access to all permissions on the server",
                            value: "all"
                        }, {
                            label: "Console",
                            description: "Access the server's console",
                            value: "console"
                        }, {
                            label: "Power actions",
                            description: "Access to start, stop, restart the server",
                            value: "power_actions"
                        }, {
                            label: "File management",
                            description: "Access to manage files on the server",
                            value: "file_management"
                        }, {
                            label: "Backup management",
                            description: "Access to manage backups on the server",
                            value: "backup_management"
                        }, {
                            label: "Schedule management",
                            description: "Access to manage schedules on the server",
                            value: "schedule_management"
                        }, {
                            label: "User management",
                            description: "Access to manage users on the server",
                            value: "user_management"
                        }, {
                            label: "Database management",
                            description: "Access to manage databases on the server",
                            value: "database_management"
                        }, {
                            label: "Allocation & Startup management",
                            description: "Access to manage allocations & startup on the server",
                            value: "allocation_management"
                        }, {
                            label: "Settings",
                            description: "Access to manage settings of the server",
                            value: "setting_management"
                        })

                    const labelEmail = new LabelBuilder()
                        .setLabel(`Email of the user:`)
                        .setTextInputComponent(inputEmail)

                    const labelInputPermissions = new LabelBuilder()
                        .setLabel(`Permissions of the subuser:`)
                        .setCheckboxGroupComponent(checkBoxGroupPermissions)

                    modal
                        .addLabelComponents(labelEmail)
                        .addLabelComponents(labelInputPermissions)

                    button.showModal(modal).catch(() => null);

                    const filterModal = (modal) => modal.customId === `add_user_${date}`;
                    button.awaitModalSubmit({filter: filterModal, time : 10 * 60 * 1000})
                        .catch(() => null)
                        .then(async (modal) => {
                            if (modal === undefined || modal === null) return
                            await modal.deferUpdate().catch(() => null);

                            const email = modal.fields.getTextInputValue('email_value');
                            const permissions = modal.fields.getCheckboxGroup('permissions__value');

                            /* Verify if a permission is selected */
                            if (permissions.length === 0) return button.followUp({
                                content: `${ctx.emojiError} You must select at least one permission!`,
                                flags: MessageFlags.Ephemeral
                            });

                            /* Verify if the email is valid */
                            if (!ctx.utils.isValidEmail(email)) return button.followUp({
                                content: `${ctx.emojiError} The email is not valid!`,
                                flags: MessageFlags.Ephemeral
                            });

                            /* Check if the sub user is trying to create a sub user with the same email as himself */
                            const account = await ctx.pelican.requestClient(`account`, userDatabase.apiKey).catch((err) => ctx.pelican.handlePelicanError(err, `account`));
                            if (!account) return button.followUp({
                                content: `${ctx.emojiError} An error occurred while fetching the account!`,
                                flags: MessageFlags.Ephemeral
                            });

                            if (account.attributes.email === email) return button.followUp({
                                content: `${ctx.emojiError} You cannot add yourself as a subuser!`,
                                flags: MessageFlags.Ephemeral
                            });

                            /* Check if the user is the owner of the server */
                            if (serverPelican.attributes.server_owner && account.attributes.email === email) return button.followUp({
                                content: `${ctx.emojiError} You cannot add the owner of the server as a subuser!`,
                                flags: MessageFlags.Ephemeral
                            });

                            /* Get all sub users */
                            const subUsers = serverPelican.attributes.relationships.subusers.data;
                            const subuser = subUsers.find((subUser) => subUser.attributes.email === email);

                            /* Format permissions */
                            const permissionGroups = {
                                console: p => p.includes('control.console'),
                                power_actions: p => p.includes('control.') && !p.includes('control.console'),
                                file_management: p => p.includes('file.'),
                                backup_management: p => p.includes('backup.'),
                                schedule_management: p => p.includes('schedule.'),
                                user_management: p => p.includes('user.'),
                                database_management: p => p.includes('database.'),
                                allocation_management: p => p.includes('allocation.'),
                                setting_management: p => p.includes('settings.'),
                                all: p => p
                            };

                            let permissionsFormatted = [];

                            for (const permission of permissions) {
                                if (permissionGroups[permission]) {
                                    permissionsFormatted.push(...listPermissions.attributes.permissions.filter(permissionGroups[permission]));
                                }
                            }

                            /* Check if the sub user already exists */
                            if (subuser) {
                                /* Update the sub user of the server */
                                const subUserUpdate = await ctx.pelican.requestClient(`servers/${serverPelicanId}/users/${subuser.attributes.uuid}`, userDatabase.apiKey, 'post', true, {
                                    permissions: permissionsFormatted
                                }).catch((err) => ctx.pelican.handlePelicanError(err, `servers/${serverPelicanId}/users/${subuser.attributes.uuid}`, 'post'));

                                if (!subUserUpdate) return button.followUp({
                                    content: `${ctx.emojiError} An error occurred while updating the subuser!`,
                                    flags: MessageFlags.Ephemeral
                                });

                                /* Send success message */
                                await modal.followUp({
                                    content: `${ctx.emojiSuccess} The user permissions of **${subUserUpdate.attributes.username}** has been updated!`,
                                    flags: MessageFlags.Ephemeral
                                });
                            }
                            else {
                                /* Add the sub user to server */
                                const subUserNew = await ctx.pelican.requestClient(`servers/${serverPelicanId}/users`, userDatabase.apiKey, 'post', true, {
                                    email: email,
                                    permissions: permissionsFormatted
                                }).catch((err) => ctx.pelican.handlePelicanError(err, `servers/${serverPelicanId}/users`, 'post'));

                                if (!subUserNew) return button.followUp({
                                    content: `${ctx.emojiError} An error occurred while adding the subuser!`,
                                    flags: MessageFlags.Ephemeral
                                });

                                /* Send success message */
                                await modal.followUp({
                                    content: `${ctx.emojiSuccess} The user **${subUserNew.attributes.username}** has been added as a subuser on this server!`,
                                    flags: MessageFlags.Ephemeral
                                });
                            }

                            // Fetch the server again
                            serverPelican = await ctx.pelican.requestClient(`servers/${serverPelicanId}?include=egg,subusers`, userDatabase.apiKey).catch((err) => ctx.pelican.handlePelicanError(err, `servers/${serverPelicanId}?include=egg,subusers`));

                            // Update the message
                            msg = await button.message.edit({
                                components: [await this.displayServer(ctx, serverPelican, serverMonitor, userDatabase.apiKey)]
                            }).catch(() => null);
                        });
                }
                else if (button.customId.startsWith('delete_subuser-')) {
                    /* Get the list of sub users */
                    const subUsers = serverPelican.attributes.relationships.subusers.data;
                    if (subUsers.length === 0) return button.reply({
                        content: `${ctx.emojiError} No subuser found on this server!`,
                        flags: MessageFlags.Ephemeral
                    });

                    const date = Date.now();
                    const modal = new ModalBuilder()
                        .setTitle('Delete a subuser')
                        .setCustomId(`delete_user_${date}`)

                    const inputSubUser = new StringSelectMenuBuilder()
                        .setCustomId(`subuser_value`)
                        .setPlaceholder('Select a subuser')
                        .setMinValues(1)
                        .setMaxValues(1)
                        .setRequired(true)
                        .addOptions(subUsers.map((subUser) => {
                            return {
                                label: subUser.attributes.username,
                                value: String(subUser.attributes.uuid),
                                emoji: "👤"
                            }
                        }).slice(0, 25))

                    const labelSubUser = new LabelBuilder()
                    .setLabel(`Subuser to delete:`)
                    .setStringSelectMenuComponent(inputSubUser)

                    modal.addLabelComponents(labelSubUser)

                    button.showModal(modal).catch(() => null);

                    const filterModal = (modal) => modal.customId === `delete_user_${date}`;
                    button.awaitModalSubmit({filter: filterModal, time : 10 * 60 * 1000})
                        .catch(() => null)
                        .then(async (modal) => {
                            if (modal === undefined || modal === null) return
                            await modal.deferUpdate().catch(() => null);

                            const subUserId = modal.fields.getStringSelectValues('subuser_value')[0];

                            /* Check if the sub user is trying to delete himself */
                            const account = await ctx.pelican.requestClient(`account`, userDatabase.apiKey).catch((err) => ctx.pelican.handlePelicanError(err, `account`));
                            if (!account) return button.followUp({
                                content: `${ctx.emojiError} An error occurred while fetching the account!`,
                                flags: MessageFlags.Ephemeral
                            });

                            if (account.attributes.uuid === subUserId) return button.followUp({
                                content: `${ctx.emojiError} You cannot delete yourself from subuser!`,
                                flags: MessageFlags.Ephemeral
                            });

                            /* Delete the sub user */
                            await ctx.pelican.requestClient(`servers/${serverPelicanId}/users/${subUserId}`, userDatabase.apiKey, 'delete').catch((err) => ctx.pelican.handlePelicanError(err, `servers/${serverPelicanId}/users/${subUserId}`, 'delete'));

                            // Fetch the server again
                            serverPelican = await ctx.pelican.requestClient(`servers/${serverPelicanId}?include=egg,subusers`, userDatabase.apiKey).catch((err) => ctx.pelican.handlePelicanError(err, `servers/${serverPelicanId}?include=egg,subusers`));

                            /* Send a success message */
                            await button.followUp({
                                content: `${ctx.emojiSuccess} The subuser has been deleted from this server!`,
                                flags: MessageFlags.Ephemeral
                            });

                            // Update the message
                            msg = await button.message.edit({
                                components: [await this.displayServer(ctx, serverPelican, serverMonitor, userDatabase.apiKey)]
                            }).catch(() => null);
                        });
                }
                else if (button.customId.startsWith('details-')) {
                    const date = Date.now();
                    const modal = new ModalBuilder()
                        .setCustomId(`details_${date}`)
                        .setTitle(`Update server details`)

                    const textInputName = new TextInputBuilder()
                        .setCustomId('name_value')
                        .setStyle(2)
                        .setRequired(false)
                        .setMaxLength(255)
                        .setMinLength(1)
                        .setValue(serverPelican.attributes.name)

                    const textInputDescription = new TextInputBuilder()
                        .setCustomId('description_value')
                        .setStyle(2)
                        .setRequired(false)

                    if (serverPelican.attributes.description) textInputDescription.setValue(serverPelican.attributes.description);

                    const labelName = new LabelBuilder()
                        .setLabel(`Name of the server:`)
                        .setTextInputComponent(textInputName)

                    const labelDescription = new LabelBuilder()
                        .setLabel(`Description of the server:`)
                        .setTextInputComponent(textInputDescription)

                    modal.addLabelComponents(labelName)
                    modal.addLabelComponents(labelDescription)

                    button.showModal(modal);

                    const filter = (modal) => modal.customId === `details_${date}`;
                    button.awaitModalSubmit({ filter, time : 5 * 60 * 1000 })
                        .catch(() => null)
                        .then(async (modal) => {
                            if (modal === undefined || modal === null) return
                            await modal.deferUpdate().catch(() => null);

                            const name = modal.fields.getTextInputValue('name_value');
                            const description = modal.fields.getTextInputValue('description_value') || null;


                            let updatedetails = false;
                            if (name !== serverPelican.attributes.name) {
                                updatedetails = true;

                                /* Update the server features on Pelican */
                                const isUpdate = await ctx.pelican.requestClient(`servers/${serverPelicanId}/settings/rename`, userDatabase.apiKey, 'post', true, {
                                    name,
                                }).catch((err) => ctx.pelican.handlePelicanError(err, `servers/${serverPelicanId}/settings/rename`, 'post'));

                                /* Check if the server was updated */
                                if (!isUpdate) return modal.followUp({
                                    content: `${ctx.emojiError} An error occurred while updating the server name!`,
                                    flags: MessageFlags.Ephemeral
                                });
                            }

                            if (description !== serverPelican.attributes.description) {
                                updatedetails = true;

                                /* Update the server features on Pelican */
                                const isUpdate = await ctx.pelican.requestClient(`servers/${serverPelicanId}/settings/description`, userDatabase.apiKey, 'post', true, {
                                    description,
                                }).catch((err) => ctx.pelican.handlePelicanError(err, `servers/${serverPelicanId}/settings/description`, 'post'));

                                /* Check if the server was updated */
                                if (!isUpdate) return modal.followUp({
                                    content: `${ctx.emojiError} An error occurred while updating the server description!`,
                                    flags: MessageFlags.Ephemeral
                                });
                            }

                            if (!updatedetails) return modal.followUp({
                                content: `${ctx.emojiError} The server details has not been updated because no changes were made!`,
                                flags: MessageFlags.Ephemeral
                            });

                            // Fetch the server again
                            serverPelican = await ctx.pelican.requestClient(`servers/${serverPelicanId}?include=egg,subusers`, userDatabase.apiKey).catch((err) => ctx.pelican.handlePelicanError(err, `servers/${serverPelicanId}?include=egg,subusers`));

                            /* Send success message */
                            await modal.followUp({
                                content: `${ctx.emojiSuccess} The server details has been updated!`,
                                flags: MessageFlags.Ephemeral
                            });

                            // Update the message
                            msg = await button.message.edit({
                                components: [await this.displayServer(ctx, serverPelican, serverMonitor, userDatabase.apiKey)]
                            }).catch(() => null);
                        });
                }
                else if (button.customId.startsWith('add_monitor-')) {
                    /* Get the list of subusers */
                    const subUsers = serverPelican.attributes.relationships.subusers.data;

                    const date = Date.now();
                    const modal = new ModalBuilder()
                        .setCustomId(`add_monitor_${date}`)
                        .setTitle(`Monitor the server`)

                    const textInputChoice = new CheckboxGroupBuilder()
                        .setCustomId('users_value')
                        .setRequired(true)
                        .setMaxValues(2)
                        .setMinValues(1)
                        .addOptions([{
                            label: "Me (owner)",
                            description: "I will be notified about status changes",
                            value: "owner",
                            default: !!(serverMonitor && JSON.parse(serverMonitor.usersId).find(userId => userId === ctx.user.id))
                        }, {
                            label: "Subusers",
                            description: "Choose subusers that will be notified about status changes",
                            value: "subusers",
                            default: !!(serverMonitor && JSON.parse(serverMonitor.usersId).filter(userId => userId !== ctx.user.id).length > 0)
                        }])

                    const inputSubUsers = new UserSelectMenuBuilder()
                        .setCustomId(`subusers_value`)
                        .setPlaceholder('Select a subuser')
                        .setRequired(false)
                        .setMinValues(0)
                        .setMaxValues(subUsers.length)

                    if (serverMonitor) {
                        const usersId = JSON.parse(serverMonitor.usersId);

                        inputSubUsers.setDefaultUsers(usersId.filter((userId) => userId !== ctx.user.id));
                    }

                    const labelChoice = new LabelBuilder()
                        .setLabel(`People to notify:`)
                        .setCheckboxGroupComponent(textInputChoice)

                    const labelSubUsers = new LabelBuilder()
                        .setLabel(`Subusers to notify:`)
                        .setUserSelectMenuComponent(inputSubUsers)

                    modal
                        .addLabelComponents(labelChoice)
                        .addLabelComponents(labelSubUsers)

                    button.showModal(modal);

                    const filter = (modal) => modal.customId === `add_monitor_${date}`;
                    button.awaitModalSubmit({ filter, time : 5 * 60 * 1000 })
                        .catch(() => null)
                        .then(async (modal) => {
                            if (modal === undefined || modal === null) return
                            await modal.deferUpdate().catch(() => null);

                            const choices = modal.fields.getCheckboxGroup('users_value');
                            const subUsers = modal.fields.getSelectedUsers('subusers_value')?.map((u) => u) || [];

                            let usersId = []
                            for (const choice of choices) {
                                if (choice === "owner") {
                                    usersId.push(ctx.user.id);
                                }
                                else if (choice === "subusers") {
                                    /* If the list of sub users is empty, send error message */
                                    if (subUsers.length === 0) return button.followUp({
                                        content: `${ctx.emojiError} You must select at least one subuser!`,
                                        flags: MessageFlags.Ephemeral
                                    });

                                    for (const subUser of subUsers) {
                                        /* If the owner is in the list, don't add it */
                                        if (subUser.id === ctx.user.id) continue;

                                        /* If the sub user is a bot, don't add it */
                                        if (subUser.bot) continue;

                                        usersId.push(subUser.id);
                                    }
                                }
                            }

                            if (serverMonitor) {
                                /* Update the server in the database */
                                await ctx.database.table('monitoring_servers').update({
                                    usersId: JSON.stringify(usersId)
                                }).where({ serverId: serverPelicanId });
                            }
                            else {
                                /* Add the server to the database */
                                await ctx.database.table('monitoring_servers').insert({
                                    serverId: serverPelicanId,
                                    discordId: ctx.user.id,
                                    usersId: JSON.stringify(usersId)
                                });
                            }

                            // Fetch the server again
                            serverPelican = await ctx.pelican.requestClient(`servers/${serverPelicanId}?include=egg,subusers`, userDatabase.apiKey).catch((err) => ctx.pelican.handlePelicanError(err, `servers/${serverPelicanId}?include=egg,subusers`));

                            /* Send success message */
                            await modal.followUp({
                                content: `${ctx.emojiSuccess} The server is now being monitored! The selected users will be notified about status changes in private messages. **Be sure that they open their DMs to receive notifications**.`,
                                flags: MessageFlags.Ephemeral
                            });

                            // Update the message
                            msg = await button.message.edit({
                                components: [await this.displayServer(ctx, serverPelican, usersId, userDatabase.apiKey)]
                            }).catch(() => null);
                        });
                }
                else if (button.customId.startsWith('delete_monitor-')) {
                    await button.deferUpdate();

                    // Disable buttons
                    await msg.edit({
                        components: ctx.messageFormatter.disableButtons(button.message.components, true)
                    }).catch(() => null);

                    /* Ask for confirmation */
                    const embedAsk = new EmbedBuilder()
                        .setDescription(`**Are you sure you want to delete monitor for the server ${serverPelican.attributes.name}?**`)
                        .setColor(ctx.me.displayColor)

                    const msgAsk = await ctx.send({
                        embeds: [embedAsk],
                        components: ctx.messageFormatter.question()
                    });

                    const collectorAsk = msgAsk.createMessageComponentCollector({ filter, idle: 5 * 60 * 1000, componentType: 2, max: 1 });
                    collectorAsk.on('collect', async (buttonConfirm) => {
                        await buttonConfirm.deferUpdate();
                        msgAsk.delete().catch(() => null);
                        collectorAsk.stop();

                        // If the user cancels the confirmation
                        if (buttonConfirm.customId !== 'yes') msg = await button.message.edit({
                            components: [await this.displayServer(ctx, serverPelican, serverMonitor, userDatabase.apiKey)]
                        }).catch(() => null);

                        /* Delete the server monitoring in database */
                        await ctx.database.table('monitoring_servers').delete().where({ serverId: serverPelicanId });

                        /* Send success message */
                        await button.followUp({
                            content: `${ctx.emojiSuccess} The server monitoring has been deleted! You will no longer receive notifications about status changes.`,
                            flags: MessageFlags.Ephemeral
                        });

                        // Update the message
                        msg = await button.message.edit({
                            components: [await this.displayServer(ctx, serverPelican, [], userDatabase.apiKey)]
                        }).catch(() => null);
                    });
                }
                else {
                    await button.deferUpdate();

                    msg = await button.message.edit({
                        components: [await this.displayServer(ctx, serverPelican, serverMonitor, userDatabase.apiKey)]
                    }).catch(() => null);
                }
            });

            collectorButton.on('end', (_, reason) => {
                if (reason === 'idle') return msg.edit({ components: ctx.messageFormatter.disableButtons(msg.components, true) }).catch(() => null);
            });
        } catch (err) {
            ctx.pelican.handlePelicanError(err, "/");
            return ctx.error('An error occurred while trying to get the servers from Pelican!');
        }
    }
}
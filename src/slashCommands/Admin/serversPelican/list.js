const SlashCommand = require('../../../managers/structures/SlashCommands.js');
const { MessageFlags, ContainerBuilder, SeparatorSpacingSize, ButtonBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, LabelBuilder, StringSelectMenuBuilder } = require('discord.js');

module.exports = class ServerList extends SlashCommand {
    constructor(handler) {
        super(handler,{
            name: 'server-list',
            description: 'Get all servers from the pelican panel',
            description_localizations: {
                "fr": "Afficher tous les serveurs du le panel pelican"
            },
            category: SlashCommand.Categories.ServerPelican,
            user_permissions: ['Administrator'],
            bot_permissions: ['EmbedLinks']
        });
    }

    /**
     * Display the container to choose a user
     * @param ctx The command context
     * @param usersDatabase The users database
     * @param page The page
     * @param serversList The server's list
     * @param totalServers The total number of servers
     * @returns {ContainerBuilder}
     */
    displayContainer(ctx, usersDatabase, page, serversList, totalServers) {
        /* Check if we have the discord user registered */
        const linkUsersToDiscord = serversList.map((server) => {
            const exist = usersDatabase.find((u) => u.userPelicanId === server.attributes.relationships.user.attributes.id)
            if (exist) return `<@${exist.discordId}> (\`${exist.discordId}\`)`
            else return '\`Not linked\`'
        });

        const container = new ContainerBuilder()
            .setAccentColor(ctx.me.displayColor)
            .addSectionComponents(s => s
                .addTextDisplayComponents(t => t.setContent(`# 📜 Servers (${totalServers})`))
                .addTextDisplayComponents(t => t.setContent(`> Select a server to see more information.`))
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
                                    `> **Owner:** ${this.utils.capitalize(server.attributes.relationships.user.attributes.username)}`,
                                    `> **Discord:** ${linkUsersToDiscord[i]}`
                                ].join("\n")
                            )
                        )
                        .setButtonAccessory(new ButtonBuilder()
                            .setCustomId(`server-${server.attributes.id}`)
                            .setStyle(2)
                            .setEmoji('ℹ️'))
                    )
            }

        return container;
    }

    /**
     * Display the server information
     * @param ctx The command context
     * @param discordInfo The discord user linked to the server
     * @param server The server
     * @param reinstall If the server is being reinstalled
     * @param transfer If the server is being transfered
     * @return {Promise<ContainerBuilder>}
     */
    async displayServer(ctx, discordInfo, server, reinstall = false, transfer = false) {
        /* Retrieve the node from Pelican */
        const nodePelican = await ctx.pelican.requestApplication(`nodes/${server.attributes.node}`).catch((err) => ctx.pelican.handlePelicanError(err, `nodes/${server.attributes.node}`));

        /* Retrieve the egg from Pelican */
        const eggPelican = await ctx.pelican.requestApplication(`eggs/${server.attributes.egg}`).catch((err) => ctx.pelican.handlePelicanError(err, `eggs/${server.attributes.egg}`));

        /* Retrieve the node config from Pelican */
        const nodeConfigPelican = await ctx.pelican.requestApplication(`nodes/${server.attributes.node}/configuration`).catch((err) => ctx.pelican.handlePelicanError(err, `nodes/${server.attributes.node}/configuration`));

        /* Retrieve logs of the server */
        const wingsLogs = await ctx.pelican.requestWings(`servers/${server.attributes.uuid}/logs?size=20`, nodePelican, nodeConfigPelican.token).catch((err) => ctx.pelican.handlePelicanError(err, `servers/${server.attributes.uuid}/logs?size=20`));

        const buttonReturn = new ButtonBuilder()
            .setCustomId('server-list')
            .setLabel('Return')
            .setStyle(2)
            .setEmoji('⬅️')

        const userPelican = server.attributes.relationships.user;

        const container = new ContainerBuilder()
            .setAccentColor(ctx.me.displayColor)
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
                        `> 🆔 **ID:** \`${server.attributes.id}\``,
                        `> 📅 **Created at:** <t:${Math.round(new Date(server.attributes.created_at).getTime() / 1000).toFixed()}:d>`,
                        `> ⛔ **Suspended:** \`${server.attributes.suspended ? ctx.emojiSuccess : ctx.emojiError}\``,
                        `> 🪪 **Owner:** ${this.utils.capitalize(userPelican.attributes.username)}`,
                        `> 💬 **Discord:** ${discordInfo}`
                    ].join("\n"))
                )
                .setButtonAccessory(new ButtonBuilder()
                    .setCustomId(`details-${server.attributes.id}`)
                    .setLabel('Update details')
                    .setEmoji('👤')
                    .setStyle(2))
            )
            .addSectionComponents(s => s
                .addTextDisplayComponents(t => t.setContent(
                    [
                        "## ✳️ Server features",
                        `> 📟 **Node:** ${nodePelican ? nodePelican.attributes.name : `\`${server.attributes.node}\` (Not found)`}`,
                        `> 🥚 **Egg** ${eggPelican ? eggPelican.attributes.name : `\`${server.attributes.egg}\` (Not found)`}`,
                        `> 🗄️ **Database:** \`${server.attributes.feature_limits.databases === 0 ? '-' : `${server.attributes.relationships.databases.data.length}/${server.attributes.feature_limits.databases}`}\``,
                        `> 💾 **Backup:** \`${server.attributes.feature_limits.backups === 0 ? '-' : server.attributes.feature_limits.backups}\``,
                        `> 🌐 **Allocation:** \`${server.attributes.feature_limits.allocations === 0 ? '-' : server.attributes.feature_limits.allocations}\``
                    ].join("\n"))
                )
                .setButtonAccessory(new ButtonBuilder()
                    .setCustomId(`features-${server.attributes.id}`)
                    .setLabel('Update features')
                    .setEmoji('✳️')
                    .setStyle(2))
            )
            .addSectionComponents(s => s
                .addTextDisplayComponents(t => t.setContent(
                    [
                        "## ⚙️ Server limits",
                        `> ♾️ **CPU:** \`${server.attributes.limits.cpu}%\``,
                        `> 🧠 **Memory:** \`${ctx.utils.formatMegabytes(server.attributes.limits.memory)}\``,
                        `> 💽 **Disk** \`${ctx.utils.formatMegabytes(server.attributes.limits.disk)}\``
                    ].join("\n"))
                )
                .setButtonAccessory(new ButtonBuilder()
                    .setCustomId(`limits-${server.attributes.id}`)
                    .setLabel('Update limits')
                    .setEmoji('⚙️')
                    .setStyle(2))
            )

        if (wingsLogs) {
            container.addTextDisplayComponents(t => t.setContent(
                [
                    "## 📝 Logs",
                    `\`\`\`ansi\n${wingsLogs.join('\n')}\`\`\``
                ].join("\n"))
            )
        }

        container
            .addSeparatorComponents(s => s.setDivider(true).setSpacing(SeparatorSpacingSize.Large))
            .addActionRowComponents(r => r.addComponents(
                new ButtonBuilder()
                    .setStyle(5)
                    .setLabel('View on Pelican')
                    .setURL(`${ctx.config["pelican"]["url"].endsWith("/") ? ctx.config["pelican"]["url"].slice(0, -1) : ctx.config["pelican"]["url"]}/admin/servers/${server.attributes.id}/edit`),
                new ButtonBuilder()
                    .setCustomId(`create_database-${server.attributes.id}`)
                    .setLabel('Create database')
                    .setEmoji('🗄️')
                    .setStyle(1)
                    .setDisabled(server.attributes.feature_limits.databases === 0 || server.attributes.relationships.databases.data.length >= server.attributes.feature_limits.databases),
                new ButtonBuilder()
                    .setCustomId(`delete_database-${server.attributes.id}`)
                    .setLabel('Delete database')
                    .setEmoji('🗄️')
                    .setStyle(4)
                    .setDisabled(server.attributes.relationships.databases.data.length === 0),
            ))
            .addActionRowComponents(r => r.addComponents(
                new ButtonBuilder()
                    .setCustomId(`reinstall-${server.attributes.id}`)
                    .setLabel('Reinstall')
                    .setEmoji('🔄')
                    .setStyle(1)
                    .setDisabled(reinstall),
                new ButtonBuilder()
                    .setCustomId(`transfer-${server.attributes.id}`)
                    .setLabel('Transfer')
                    .setEmoji('🚚')
                    .setStyle(1)
                    .setDisabled(transfer)
            ));

        return container;
    }

    async run (ctx) {
        /* Get all users registered in the database & on pelican */
        const usersDatabase = await ctx.database.table('users').select();

        const numberPerPage = 5;
        let page = 1;
        let msg;

        try {
            let serversPelican = await ctx.pelican.requestApplication("servers?include=user,allocations,databases");

            /* Check if there is at least one user */
            if (!serversPelican[0]) return ctx.error('No server found on Pelican!');

            let serversList = ctx.utils.getNumberPacket(serversPelican, numberPerPage);
            const filter = (button) => button.user.id === ctx.user.id;

            let container = this.displayContainer(ctx, usersDatabase, page, serversList[page-1], serversPelican.length);

            if (serversList.length === 1) {
                msg = await ctx.send({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { parse: [] }
                });
            }
            else {
                const componentPage = ctx.messageFormatter.pages(`Page ${page}/${serversList.length}`, page, serversList.length);

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

                    const componentPage = ctx.messageFormatter.pages(`Page ${page}/${serversList.length}`, page, serversList.length);

                    // Delete the component at setId 2 to avoid duplicates
                    container = this.displayContainer(ctx, usersDatabase, page, serversList[page-1], serversPelican.length);

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
                if (["left", "right"].includes(button.customId)) return

                if (button.customId === 'server-list') {
                    await button.deferUpdate();
                    return button.message.edit({ components: [container], allowedMentions: { parse: [] } }).catch(() => null);
                }

                /* Retrieve the user on pelican */
                const serverPelicanId = button.customId.split('-')[1];
                let serverPelican = serversPelican.find((s) => s.attributes.id === Number(serverPelicanId));
                if (!serverPelican) return button.reply({ content: `${ctx.emojiError} This server does not exist on Pelican!`, flags: MessageFlags.Ephemeral });

                /* Get the discord user registered */
                let discordInfo = usersDatabase.find((u) => u.userPelicanId === serverPelican.attributes.relationships.user.attributes.id);
                discordInfo = discordInfo ? `<@${discordInfo.discordId}> (\`${discordInfo.discordId}\`)` : '\`Not linked\`';

                if (button.customId.startsWith('reinstall-')) {
                    await button.deferUpdate();

                    // Disable buttons
                    await button.message.edit({
                        components: ctx.messageFormatter.disableButtons(button.message.components, true),
                        allowedMentions: { parse: [] }
                    }).catch(() => null);

                    /* Ask for confirmation */
                    const embedAsk = new EmbedBuilder()
                        .setDescription(`**Are you sure you want to reinstall the server **${serverPelican.attributes.name}**?**`)
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
                        if (buttonConfirm.customId !== 'yes') return button.message.edit({
                            components: [await this.displayServer(ctx, discordInfo, serverPelican)],
                            allowedMentions: { parse: [] }
                        }).catch(() => null);

                        await ctx.pelican.requestApplication(`servers/${serverPelicanId}/reinstall`, 'post').catch((err) => ctx.pelican.handlePelicanError(err, `servers/${serverPelicanId}/reinstall`));

                        button.message.edit({
                            components: [await this.displayServer(ctx, discordInfo, serverPelican, true, true)],
                            allowedMentions: { parse: [] }
                        }).catch(() => null);

                        return button.followUp({ content: `${ctx.emojiSuccess} The server is being reinstalled!` });
                    });
                }
                else if (button.customId.startsWith('transfer-')) {
                    const date = Date.now();
                    const modal = new ModalBuilder()
                        .setCustomId(`transfer_${date}`)
                        .setTitle(`Transfer server`)

                    /* Retrieve nodes on Pelican */
                    const nodesPelican = await ctx.pelican.requestApplication("nodes").catch((err) => ctx.pelican.handlePelicanError(err, `nodes`));

                    const selectInputNode = new StringSelectMenuBuilder()
                        .setCustomId('node_value')
                        .setRequired(false)
                        .setPlaceholder('Select a node')
                        .setMinValues(1)
                        .setMaxValues(1)

                    if (nodesPelican[0]) {
                        selectInputNode.addOptions(nodesPelican.slice(0, 25)
                            .map((node) => {
                                return {
                                    label: node.attributes.name.length > 100 ? this.utils.capitalize(`${node.attributes.name.slice(0, 95)} ...`) : this.utils.capitalize(node.attributes.name),
                                    value: String(node.attributes.id),
                                    default: node.attributes.id === serverPelican.attributes.node
                                }
                            })
                        )
                    }
                    else {
                        selectInputNode.setDisabled(true);
                        selectInputNode.setPlaceholder('No node found on Pelican!');
                    }

                    const labelNode = new LabelBuilder()
                        .setLabel(`Node to transfer to:`)
                        .setStringSelectMenuComponent(selectInputNode)

                    modal.addLabelComponents(labelNode)

                    button.showModal(modal);

                    const filter = (modal) => modal.customId === `transfer_${date}`;
                    button.awaitModalSubmit({ filter, time : 5 * 60 * 1000 })
                        .catch(() => null)
                        .then(async (modal) => {
                            if (modal === undefined || modal === null) return
                            await modal.deferUpdate().catch(() => null);

                            const node = modal.fields.getStringSelectValues('node_value')[0];

                            // Check if the node exists
                            const nodePelican = nodesPelican.find((eg) => eg.attributes.id === Number(node));
                            if (!nodePelican) return modal.followUp({
                                content: `${ctx.emojiError} This node does not exist on Pelican!`,
                                flags: MessageFlags.Ephemeral
                            });

                            /* Get all allocations */
                            let allocations = await ctx.pelican.requestApplication(`nodes/${nodePelican.attributes.id}/allocations`).catch((err) => ctx.pelican.handlePelicanError(err, `nodes/${nodePelican.attributes.id}/allocations`));

                            /* Get the number of allocations on the old server */
                            const oldAllocations = serverPelican.attributes.relationships.allocations.data.length;

                            /* Get free allocations */
                            let freeAllocations = allocations.filter(a => !a.attributes.assigned);

                            /* Create missing allocations */
                            if (freeAllocations.length < oldAllocations) {
                                const missing = oldAllocations - freeAllocations.length;

                                /* Get biggest existing port */
                                let biggestPort = allocations.length
                                    ? Math.max(...allocations.map(a => a.attributes.port))
                                    : 2000;

                                for (let i = 0; i < missing; i++) {
                                    biggestPort++;

                                    await ctx.pelican.requestApplication(
                                        `nodes/${nodePelican.attributes.id}/allocations`,
                                        'post',
                                        {
                                            ip: nodePelican.attributes.relationships.allocations.data[0].attributes.ip,
                                            ports: [`${biggestPort}`],
                                        }
                                    ).catch((err) => {
                                        ctx.pelican.handlePelicanError(err, `nodes/${nodePelican.attributes.id}/allocations`, 'post')
                                        return button.followUp({ content: `${ctx.emojiError} An error occurred while creating an allocation!` });
                                    });
                                }

                                /* Refresh allocations */
                                allocations = await ctx.pelican.requestApplication(`nodes/${nodePelican.attributes.id}/allocations`).catch((err) => ctx.pelican.handlePelicanError(err, `nodes/${nodePelican.attributes.id}/allocations`));

                                freeAllocations = allocations.filter(a => !a.attributes.assigned);
                            }

                            /* Keep the allocations that will be assigned to the server */
                            const serverAllocations = freeAllocations.slice(0, oldAllocations).map(a => a.attributes.id);

                            // Transfer the server
                            if (serverPelican.attributes.node !== nodePelican.attributes.id) {
                                await ctx.pelican.requestApplication(`servers/${serverPelicanId}/transfer`, 'post', {
                                    node_id: nodePelican.attributes.id,
                                    allocation_id: serverAllocations[0],
                                    allocation_additional: serverAllocations.slice(1)
                                }).catch((err) => ctx.pelican.handlePelicanError(err, `servers/${serverPelicanId}/transfer`, 'post'));

                                // Fetch the server again
                                serversPelican = await ctx.pelican.requestApplication("servers?include=user,allocations,databases").catch((err) => ctx.pelican.handlePelicanError(err, `servers?include=user,allocations,databases`));
                                serversList = ctx.utils.getNumberPacket(serversPelican, numberPerPage);

                                serverPelican = serversPelican.find((s) => s.attributes.id === Number(serverPelican.attributes.id));

                                /* Send success message */
                                await modal.followUp({
                                    content: `${ctx.emojiSuccess} The server **${serverPelican.attributes.name}** has been successfully transferred to the node **${nodePelican.attributes.name}**!`,
                                    flags: MessageFlags.Ephemeral
                                });

                                // Update the message
                                return button.message.edit({
                                    components: [await this.displayServer(ctx, discordInfo, serverPelican, true, true)],
                                    allowedMentions: { parse: [] }
                                }).catch(() => null);
                            }
                            else {
                                await modal.followUp({
                                    content: `${ctx.emojiError} The transfer server is the same as the current one!`,
                                    flags: MessageFlags.Ephemeral
                                });
                            }
                        });
                }
                else if (button.customId.startsWith('create_database-')) {
                    /* Check if the limit is not reached */
                    if (serverPelican.attributes.relationships.databases.data.length >= serverPelican.attributes.feature_limits.databases) return button.reply({
                        content: `${ctx.emojiError} The limit of databases has been reached! Please increase the limit before trying to create a new database.`,
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

                            /* Get the database host for this node */
                            const databasesHost = await ctx.pelican.requestApplication(`database-hosts?include=nodes`).catch((err) => ctx.pelican.handlePelicanError(err, `database-hosts?include=nodes`));
                            if (!databasesHost[0]) return modal.followUp({
                                content: `${ctx.emojiError} No database host found on Pelican!`,
                                flags: MessageFlags.Ephemeral
                            });

                            const databaseHost = databasesHost.find((database) => database.attributes.relationships.nodes.data[0].attributes.id === serverPelican.attributes.node);
                            if (!databaseHost) return modal.followUp({
                                content: `${ctx.emojiError} No database host found for this node!`,
                                flags: MessageFlags.Ephemeral
                            });

                            const database = await ctx.pelican.requestApplication(`servers/${serverPelicanId}/databases`, 'post', {
                                database: databaseName,
                                remote: "%",
                                host: databaseHost.attributes.id,
                            }).catch((err) => ctx.pelican.handlePelicanError(err, `servers/${serverPelicanId}/databases`, 'post'));

                            if (!database) {
                                return modal.followUp({
                                    content: `${ctx.emojiError} An error occurred while creating the database!`,
                                    flags: MessageFlags.Ephemeral
                                });
                            }

                            // Fetch the server again
                            serversPelican = await ctx.pelican.requestApplication("servers?include=user,allocations,databases").catch((err) => ctx.pelican.handlePelicanError(err, `servers?include=user,allocations,databases`));
                            serversList = ctx.utils.getNumberPacket(serversPelican, numberPerPage);

                            serverPelican = serversPelican.find((s) => s.attributes.id === Number(serverPelican.attributes.id));

                            /* Send success message */
                            await modal.followUp({
                                content: `${ctx.emojiSuccess} The database \`${database.attributes.database}\` has been successfully created on the server **${serverPelican.attributes.name}**!`,
                                flags: MessageFlags.Ephemeral
                            });

                            // Update the message
                            return button.message.edit({
                                components: [await this.displayServer(ctx, discordInfo, serverPelican)],
                                allowedMentions: { parse: [] }
                            }).catch(() => null);
                        });
                }
                else if (button.customId.startsWith('delete_database-')) {
                    /* Check if database exists */
                    if (serverPelican.attributes.relationships.databases.data.length === 0) return button.reply({
                        content: `${ctx.emojiError} No database found on this server!`,
                        flags: MessageFlags.Ephemeral
                    });

                    const date = Date.now();
                    const modal = new ModalBuilder()
                        .setCustomId(`delete_database_${date}`)
                        .setTitle(`Delete database`)

                    /* Retrieve databases on Pelican */
                    const databasesPelican = await ctx.pelican.requestApplication(`servers/${serverPelican.attributes.id}/databases`).catch((err) => ctx.pelican.handlePelicanError(err, `servers/${serverPelican.attributes.id}/databases`));

                    const selectInputDatabase = new StringSelectMenuBuilder()
                        .setCustomId('database_value')
                        .setRequired(false)
                        .setPlaceholder('Select a database')
                        .setMinValues(1)
                        .setMaxValues(1)

                    if (databasesPelican[0]) {
                        selectInputDatabase.addOptions(databasesPelican.slice(0, 25)
                            .map((database) => {
                                return {
                                    label: database.attributes.database.length > 100 ? this.utils.capitalize(`${database.attributes.database.slice(0, 95)} ...`) : this.utils.capitalize(database.attributes.database),
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

                            await ctx.pelican.requestApplication(`servers/${serverPelican.attributes.id}/databases/${databaseId}`, 'delete', ).catch((err) => ctx.pelican.handlePelicanError(err, `servers/${serverPelican.attributes.id}/databases/${databaseId}`, 'delete'));

                            // Fetch the server again
                            serversPelican = await ctx.pelican.requestApplication("servers?include=user,allocations,databases").catch((err) => ctx.pelican.handlePelicanError(err, `servers?include=user,allocations,databases`));
                            serversList = ctx.utils.getNumberPacket(serversPelican, numberPerPage);

                            serverPelican = serversPelican.find((s) => s.attributes.id === Number(serverPelican.attributes.id));

                            /* Send success message */
                            await modal.followUp({
                                content: `${ctx.emojiSuccess} The database has been successfully deleted on the server **${serverPelican.attributes.name}**!`,
                                flags: MessageFlags.Ephemeral
                            });

                            // Update the message
                            return button.message.edit({
                                components: [await this.displayServer(ctx, discordInfo, serverPelican)],
                                allowedMentions: { parse: [] }
                            }).catch(() => null);
                        });
                }
                else if (button.customId.startsWith('features-')) {
                    const date = Date.now();
                    const modal = new ModalBuilder()
                        .setCustomId(`features_${date}`)
                        .setTitle(`Update server features`)

                    /* Retrieve eggs on Pelican */
                    const eggsPelican = await ctx.pelican.requestApplication("eggs?include=variables").catch((err) => ctx.pelican.handlePelicanError(err, `eggs?include=variables`));

                    const selectInputEgg = new StringSelectMenuBuilder()
                        .setCustomId('egg_value')
                        .setRequired(false)
                        .setPlaceholder('Select an egg')
                        .setMinValues(1)
                        .setMaxValues(1)

                    if (eggsPelican[0]) {
                        selectInputEgg.addOptions(eggsPelican.slice(0, 25)
                            .map((egg) => {
                                return {
                                    label: egg.attributes.name.length > 100 ? this.utils.capitalize(`${egg.attributes.name.slice(0, 95)} ...`) : this.utils.capitalize(egg.attributes.name),
                                    value: String(egg.attributes.id),
                                    description: egg.attributes.description.length > 100 ? egg.attributes.description.slice(0, 95) + ' ...' : egg.attributes.description,
                                    default: egg.attributes.id === serverPelican.attributes.egg
                                }
                            })
                        )
                    }

                    const textInputDatabase = new TextInputBuilder()
                        .setCustomId('database_value')
                        .setStyle(1)
                        .setRequired(false)
                        .setValue(String(serverPelican.attributes.feature_limits.databases))

                    const textInputBackup = new TextInputBuilder()
                        .setCustomId('backup_value')
                        .setStyle(1)
                        .setRequired(false)
                        .setValue(String(serverPelican.attributes.feature_limits.backups))

                    const textInputAllocation = new TextInputBuilder()
                        .setCustomId('allocation_value')
                        .setStyle(1)
                        .setRequired(false)
                        .setValue(String(serverPelican.attributes.feature_limits.allocations))

                    const labelEgg = new LabelBuilder()
                        .setLabel(`Egg of the server:`)
                        .setStringSelectMenuComponent(selectInputEgg)

                    const labelDatabase = new LabelBuilder()
                        .setLabel(`Databases to allow:`)
                        .setTextInputComponent(textInputDatabase)

                    const labelBackup = new LabelBuilder()
                        .setLabel(`Backups to allow:`)
                        .setTextInputComponent(textInputBackup)

                    const labelAllocation = new LabelBuilder()
                        .setLabel(`Allocations to allow:`)
                        .setTextInputComponent(textInputAllocation)

                    modal.addLabelComponents(labelEgg)
                    modal.addLabelComponents(labelDatabase)
                    modal.addLabelComponents(labelBackup)
                    modal.addLabelComponents(labelAllocation)

                    button.showModal(modal);

                    const filter = (modal) => modal.customId === `features_${date}`;
                    button.awaitModalSubmit({ filter, time : 5 * 60 * 1000 })
                        .catch(() => null)
                        .then(async (modal) => {
                            if (modal === undefined || modal === null) return
                            await modal.deferUpdate().catch(() => null);

                            const egg = modal.fields.getStringSelectValues('egg_value')[0];
                            const databases = Number(modal.fields.getTextInputValue('database_value'));
                            const backups = Number(modal.fields.getTextInputValue('backup_value'));
                            const allocations = Number(modal.fields.getTextInputValue('allocation_value'));

                            // Check if the egg exists
                            const eggPelican = eggsPelican.find((eg) => eg.attributes.id === Number(egg));
                            if (!eggPelican) return modal.followUp({
                                content: `${ctx.emojiError} This egg does not exist on Pelican!`,
                                flags: MessageFlags.Ephemeral
                            });

                            // Check if the database is correct
                            if (isNaN(databases) || databases < 0 || databases > 10) return modal.followUp({
                                content: `${ctx.emojiError} Databases must be a number between 0 and 10!`,
                                flags: MessageFlags.Ephemeral
                            });

                            // Check if the backup is correct
                            if (isNaN(backups) || backups < 0 || backups > 10) return modal.followUp({
                                content: `${ctx.emojiError} Backups must be a number between 0 and 10!`,
                                flags: MessageFlags.Ephemeral
                            });

                            // Check if the allocation is correct
                            if (isNaN(allocations) || allocations < 1 || allocations > 10) return modal.followUp({
                                content: `${ctx.emojiError} Allocations must be a number between 1 and 10!`,
                                flags: MessageFlags.Ephemeral
                            });

                            // Update the server features on Pelican
                            let updateServer = false;
                            if (serverPelican.attributes.egg !== eggPelican.attributes.id) {
                                updateServer = true;

                                const isUpdate = await ctx.pelican.requestApplication(`servers/${serverPelicanId}/startup`, 'patch', {
                                    environment: eggPelican.attributes.relationships.variables.data.reduce((acc, variable) => {
                                        acc[variable.attributes.env_variable] = variable.attributes.default_value;
                                        return acc;
                                    }, {}),
                                    egg: eggPelican.attributes.id,
                                    docker_image: eggPelican.attributes.docker_image,
                                    skip_scripts: false
                                }).catch((err) => ctx.pelican.handlePelicanError(err, `servers/${serverPelicanId}/startup`, 'patch'));

                                /* Check if the server was updated */
                                if (!isUpdate) return modal.followUp({
                                    content: `${ctx.emojiError} An error occurred while updating the server features!`,
                                    flags: MessageFlags.Ephemeral
                                });
                            }

                            if (databases !== serverPelican.attributes.feature_limits.databases ||
                            backups !== serverPelican.attributes.feature_limits.backups ||
                            allocations !== serverPelican.attributes.feature_limits.allocations) {
                                updateServer = true;

                                /* Remove allocations if new value is less than previous one */
                                const allocationsToRemoveArray = [];
                                let allocation = serverPelican.attributes.allocation
                                if (allocations < serverPelican.attributes.feature_limits.allocations) {
                                    const allocationsToRemove = serverPelican.attributes.feature_limits.allocations - allocations;

                                    for (let i = 0; i < allocationsToRemove; i++) {
                                        const allocationToRemove = serverPelican.attributes.relationships.allocations.data[i];
                                        if (allocationToRemove) {
                                            allocationsToRemoveArray.push(allocationToRemove.attributes.id);

                                            /* If it is the current allocation, set it to another allocation */
                                            if (allocation === allocationToRemove.attributes.id) {
                                                const newAllocation = serverPelican.attributes.relationships.allocations.data.find((a) => a.attributes.id !== allocationToRemove.attributes.id);
                                                if (newAllocation) {
                                                    allocation = newAllocation.attributes.id;
                                                }
                                            }
                                        }
                                    }
                                }

                                /* Update the server features on Pelican */
                                const isUpdate = await ctx.pelican.requestApplication(`servers/${serverPelicanId}/build`, 'patch', {
                                    limits: serverPelican.attributes.limits,
                                    feature_limits: {
                                        databases,
                                        backups,
                                        allocations
                                    },
                                    allocation,
                                    remove_allocations: allocationsToRemoveArray
                                }).catch((err) => ctx.pelican.handlePelicanError(err, `servers/${serverPelicanId}/build`, 'patch'));

                                /* Check if the server was updated */
                                if (!isUpdate) return modal.followUp({
                                    content: `${ctx.emojiError} An error occurred while updating the server features!`,
                                    flags: MessageFlags.Ephemeral
                                });
                            }

                            if (updateServer) {
                                // Fetch the server again
                                serversPelican = await ctx.pelican.requestApplication("servers?include=user,allocations,databases").catch((err) => ctx.pelican.handlePelicanError(err, `servers?include=user`));
                                serversList = ctx.utils.getNumberPacket(serversPelican, numberPerPage);

                                serverPelican = serversPelican.find((s) => s.attributes.id === Number(serverPelican.attributes.id));

                                /* Send success message */
                                await modal.followUp({
                                    content: `${ctx.emojiSuccess} The server features has been updated! A restart may be needed in order to apply the changes.`,
                                    flags: MessageFlags.Ephemeral
                                });

                                // Update the message
                                return button.message.edit({
                                    components: [await this.displayServer(ctx, discordInfo, serverPelican)],
                                    allowedMentions: { parse: [] }
                                }).catch(() => null);
                            }
                            else {
                                await modal.followUp({
                                    content: `${ctx.emojiError} The server features has not been updated because no changes were made!`,
                                    flags: MessageFlags.Ephemeral
                                });
                            }
                        });
                }
                else if (button.customId.startsWith('limits-')) {
                    const date = Date.now();
                    const modal = new ModalBuilder()
                        .setCustomId(`limits_${date}`)
                        .setTitle(`Update server limits`)

                    const textInputCPU = new TextInputBuilder()
                        .setCustomId('cpu_value')
                        .setStyle(1)
                        .setRequired(false)
                        .setValue(String(serverPelican.attributes.limits.cpu))

                    const textInputMemory = new TextInputBuilder()
                        .setCustomId('memory_value')
                        .setStyle(1)
                        .setRequired(false)
                        .setValue(String(serverPelican.attributes.limits.memory))

                    const textInputDisk = new TextInputBuilder()
                        .setCustomId('disk_value')
                        .setStyle(1)
                        .setRequired(false)
                        .setValue(String(serverPelican.attributes.limits.disk))

                    const labelCPU = new LabelBuilder()
                        .setLabel(`CPU to allow:`)
                        .setTextInputComponent(textInputCPU)

                    const labelMemory = new LabelBuilder()
                        .setLabel(`Memory to allow:`)
                        .setTextInputComponent(textInputMemory)

                    const labelDisk = new LabelBuilder()
                        .setLabel(`Disk to allow:`)
                        .setTextInputComponent(textInputDisk)

                    modal.addLabelComponents(labelCPU)
                    modal.addLabelComponents(labelMemory)
                    modal.addLabelComponents(labelDisk)

                    button.showModal(modal);

                    const filter = (modal) => modal.customId === `limits_${date}`;
                    button.awaitModalSubmit({ filter, time : 5 * 60 * 1000 })
                        .catch(() => null)
                        .then(async (modal) => {
                            if (modal === undefined || modal === null) return
                            await modal.deferUpdate().catch(() => null);

                            const cpu = Number(modal.fields.getTextInputValue('cpu_value'));
                            const memory = Number(modal.fields.getTextInputValue('memory_value'));
                            const disk = Number(modal.fields.getTextInputValue('disk_value'));

                            // Check if the cpu is correct
                            if (isNaN(cpu) || cpu < 0) return modal.followUp({
                                content: `${ctx.emojiError} CPU must be a number greater than or equal to 0!`,
                                flags: MessageFlags.Ephemeral
                            });

                            // Check if the memory is correct
                            if (isNaN(memory) || memory < 0) return modal.followUp({
                                content: `${ctx.emojiError} Memory must be a number greater than or equal to 0!`,
                                flags: MessageFlags.Ephemeral
                            });

                            // Check if the disk is correct
                            if (isNaN(disk) || disk < 0) return modal.followUp({
                                content: `${ctx.emojiError} Disk must be a number greater than or equal to 0!`,
                                flags: MessageFlags.Ephemeral
                            });

                            if (cpu !== serverPelican.attributes.limits.cpu ||
                                memory !== serverPelican.attributes.limits.memory ||
                                disk !== serverPelican.attributes.limits.disk) {
                                /* Update the server features on Pelican */
                                const isUpdate = await ctx.pelican.requestApplication(`servers/${serverPelicanId}/build`, 'patch', {
                                    limits: {
                                        cpu,
                                        memory,
                                        disk,
                                        swap: serverPelican.attributes.limits.swap,
                                        io: serverPelican.attributes.limits.io
                                    },
                                    feature_limits: serverPelican.attributes.feature_limits,
                                    allocation: serverPelican.attributes.allocation
                                }).catch((err) => ctx.pelican.handlePelicanError(err, `servers/${serverPelicanId}/build`, 'patch'));

                                /* Check if the server was updated */
                                if (!isUpdate) return modal.followUp({
                                    content: `${ctx.emojiError} An error occurred while updating the server limits!`,
                                    flags: MessageFlags.Ephemeral
                                });

                                // Fetch the server again
                                serversPelican = await ctx.pelican.requestApplication("servers?include=user,allocations,databases").catch((err) => ctx.pelican.handlePelicanError(err, `servers?include=user,allocations,databases`));
                                serversList = ctx.utils.getNumberPacket(serversPelican, numberPerPage);

                                serverPelican = serversPelican.find((s) => s.attributes.id === Number(serverPelican.attributes.id));

                                /* Send success message */
                                await modal.followUp({
                                    content: `${ctx.emojiSuccess} The server limits has been updated!`,
                                    flags: MessageFlags.Ephemeral
                                });

                                // Update the message
                                return button.message.edit({
                                    components: [await this.displayServer(ctx, discordInfo, serverPelican)],
                                    allowedMentions: { parse: [] }
                                }).catch(() => null);
                            }
                            else {
                                await modal.followUp({
                                    content: `${ctx.emojiError} The server limits has not been updated because no changes were made!`,
                                    flags: MessageFlags.Ephemeral
                                });
                            }
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


                            if (name !== serverPelican.attributes.name || description !== serverPelican.attributes.description) {
                                /* Update the server features on Pelican */
                                const isUpdate = await ctx.pelican.requestApplication(`servers/${serverPelicanId}/details`, 'patch', {
                                    name,
                                    description,
                                    user: serverPelican.attributes.user
                                }).catch((err) => ctx.pelican.handlePelicanError(err, `servers/${serverPelicanId}/details`, 'patch'));

                                /* Check if the server was updated */
                                if (!isUpdate) return modal.followUp({
                                    content: `${ctx.emojiError} An error occurred while updating the server details!`,
                                    flags: MessageFlags.Ephemeral
                                });

                                // Fetch the server again
                                serversPelican = await ctx.pelican.requestApplication("servers?include=user,allocations,databases").catch((err) => ctx.pelican.handlePelicanError(err, `servers?include=user,allocations,databases`));
                                serversList = ctx.utils.getNumberPacket(serversPelican, numberPerPage);

                                serverPelican = serversPelican.find((s) => s.attributes.id === Number(serverPelican.attributes.id));

                                /* Send success message */
                                await modal.followUp({
                                    content: `${ctx.emojiSuccess} The server details has been updated!`,
                                    flags: MessageFlags.Ephemeral
                                });

                                // Update the message
                                return button.message.edit({
                                    components: [await this.displayServer(ctx, discordInfo, serverPelican)],
                                    allowedMentions: { parse: [] }
                                }).catch(() => null);
                            }
                            else {
                                await modal.followUp({
                                    content: `${ctx.emojiError} The server details has not been updated because no changes were made!`,
                                    flags: MessageFlags.Ephemeral
                                });
                            }
                        });
                }
                else {
                    await button.deferUpdate();

                    return msg.edit({
                        components: [await this.displayServer(ctx, discordInfo, serverPelican)],
                        allowedMentions: { parse: [] }
                    }).catch(() => null);
                }
            });

            collectorButton.on('end', (_, reason) => {
                if (reason === 'idle') return msg.edit({ components: ctx.messageFormatter.disableButtons(msg.components, true), allowedMentions: { parse: [] } }).catch(() => null);
            });
        } catch (err) {
            ctx.pelican.handlePelicanError(err, `servers?include=user,allocations,databases`);
            return ctx.error('An error occurred while trying to get the servers from Pelican!');
        }
    }
}

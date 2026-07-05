const SlashCommand = require('../../../managers/structures/SlashCommands.js');
const { EmbedBuilder, ButtonBuilder, TextDisplayBuilder, ModalBuilder, TextInputBuilder,
    MessageFlags, ContainerBuilder, SeparatorSpacingSize, LabelBuilder } = require('discord.js');
const ms = require('ms');
const schedule = require('node-schedule');

module.exports = class ServerCreate extends SlashCommand {
    constructor(handler) {
        super(handler,{
            name: 'server-create',
            description: 'Create a new server on the pelican panel',
            description_localizations: {
                "fr": "Créer un nouveau serveur sur le panel pelican"
            },
            options: [{
                name: 'name',
                description: 'Name of the server to create',
                description_localizations: {
                    "fr": "Nom du serveur à créer"
                },
                type: 3,
                required: true,
                min_length: 1,
                max_length: 255
            }, {
                name: 'pelican-user',
                description: 'Pelican user to link to the server',
                description_localizations: {
                    "fr": "Utilisateur Pelican à lier au serveur"
                },
                type: 3,
                required: true,
                autocomplete: true
            }, {
                name: 'node',
                description: 'Node of the server to create',
                description_localizations: {
                    "fr": "Nœud du serveur à créer"
                },
                type: 3,
                required: true,
                autocomplete: true
            }, {
                name: 'egg',
                description: 'Egg of the server to create',
                description_localizations: {
                    "fr": "Oeuf du serveur à créer"
                },
                type: 3,
                required: true,
                autocomplete: true
            }, {
                name: 'time',
                name_localizations: {
                    "fr": "temps",
                },
                description: 'Time to suspend the server in day',
                description_localizations: {
                    "fr": "Temps à suspendre le serveur en jour",
                },
                type: 4,
                required: false
            }],
            category: SlashCommand.Categories.ServerPelican,
            user_permissions: ['Administrator']
        });
    }

    /**
     * Display the main components
     * @param ctx
     * @param {{name: *, description: *, user: *, node: *, egg: *, userData: *, nodeData: *, eggData: *, database: *, backup: *, memory: *, disk: *, cpu: *, allocation: *}} data
     * @param {string} userDiscord
     * @returns {ContainerBuilder}
     */
    displayMainComponents(ctx, data, userDiscord) {
        const buttonFinish = new ButtonBuilder()
            .setCustomId('button_finish')
            .setStyle(3)
            .setLabel(`Create the server`)
            .setEmoji(`${ctx.emojiSuccess}`)

        const buttonCancel = new ButtonBuilder()
            .setCustomId('button_cancel')
            .setStyle(4)
            .setLabel(`Cancel the creation`)
            .setEmoji(`${ctx.emojiError}`)

        const container = new ContainerBuilder()
            .setAccentColor(ctx.me.displayColor)
            .addSectionComponents(s => s
                .addTextDisplayComponents(t => t.setContent(`### ➕ Creation of a new server`))
                .addTextDisplayComponents(t => t.setContent(`> You are currently creating a server${userDiscord}!`))
                .setThumbnailAccessory(t => t.setURL(ctx.me.displayAvatarURL()))
            )
            .addSectionComponents(s => s
                .addTextDisplayComponents(t => t.setContent(`# 💬 Server details`))
                .addTextDisplayComponents(t => t.setContent(
                    [
                        `> ✏️ **Name:** ${data.name}`,
                        `> 💬 **Description:** ${data.description ? data.description : '\`-\`'}`,
                        `> 👤 **Owner:** ${ctx.utils.capitalize(data.userData.attributes.username)}`
                    ].join('\n')
                ))
                .setButtonAccessory(
                    new ButtonBuilder()
                        .setCustomId('button_server_details')
                        .setEmoji('💬')
                        .setStyle(2)
                )
            )
            .addSectionComponents(s => s
                .addTextDisplayComponents(t => t.setContent(`# ✳️ Server features`))
                .addTextDisplayComponents(t => t.setContent(
                    [
                        `> 📟 **Node:** ${data.nodeData.attributes.name}`,
                        `> 🥚 **Egg** ${data.eggData.attributes.name}`,
                        `> 🗄️ **Database:** \`${data.database === 0 ? '-' : data.database}\``,
                        `> 💾 **Backup:** \`${data.backup === 0 ? '-' : data.backup}\``,
                        `> 🌐 **Allocation:** \`${data.allocation === 0 ? '-' : data.allocation}\``
                    ].join('\n')
                ))
                .setButtonAccessory(
                    new ButtonBuilder()
                        .setCustomId('button_server_features')
                        .setEmoji('✳️')
                        .setStyle(2)
                )
            )
            .addSectionComponents(s => s
                .addTextDisplayComponents(t => t.setContent(`# ⚙️ Server limits`))
                .addTextDisplayComponents(t => t.setContent(
                    [
                        `> ♾️ **CPU:** \`${data.cpu}%\``,
                        `> 🧠 **Memory:** \`${ctx.utils.formatMegabytes(data.memory)}\``,
                        `> 💽 **Disk** \`${ctx.utils.formatMegabytes(data.disk)}\``
                    ].join('\n')
                ))
                .setButtonAccessory(
                    new ButtonBuilder()
                        .setCustomId('button_server_limits')
                        .setEmoji('⚙️')
                        .setStyle(2)
                )
            )

        container
            .addSeparatorComponents(s => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addActionRowComponents(r => r.addComponents(buttonFinish, buttonCancel))

        return container
    }

    /**
     * Display the creation components
     * @param ctx
     * @param {boolean} installed
     * @param {object} server
     * @returns {ContainerBuilder}
     */
    displayCreationComponents(ctx, installed, server) {
        return new ContainerBuilder()
            .setAccentColor(ctx.me.displayColor)
            .addSectionComponents(s => s
                .addTextDisplayComponents(t => t.setContent(`### ➕ Creation of a new server`))
                .addTextDisplayComponents(t => t.setContent(
                    [
                        `${ctx.emojiSuccess} Creation of the server`,
                        `${installed ? `${ctx.emojiSuccess} Installation completed. You can now manage it [here](${ctx.config['pelican']['url']}/server/${server.attributes.identifier}).` : ':clock10: Installation of the server in progress...'}`
                    ].join('\n')
                ))
                .setThumbnailAccessory(t => t.setURL(ctx.me.displayAvatarURL()))
            )
    }

    async run (ctx) {
        const time = ctx.options.getInteger('time') || null;

        let data = {
            name: ctx.options.getString('name'),
            description: null,
            user: Number(ctx.options.getString('pelican-user')),
            node: Number(ctx.options.getString('node')),
            egg: Number(ctx.options.getString('egg')),
            userData: null,
            nodeData: null,
            eggData: null,
            database: 0,
            backup: 0,
            memory: 0,
            disk: 0,
            cpu: 0,
            allocation: 1
        }

        /* Check if the time is correct */
        if (time && !ms(`${time}d`)) return ctx.error('The time format is incorrect!');

        /* Retrieve the user from Pelican */
        const userPelican = await ctx.pelican.requestApplication(`users/${data.user}`).catch((err) => ctx.pelican.handlePelicanError(err, `users/${data.user}`));
        if (!userPelican) return ctx.error('This user does not exist!');

        /* Retrieve the node from Pelican */
        const nodePelican = await ctx.pelican.requestApplication(`nodes/${data.node}?include=allocations`).catch((err) => ctx.pelican.handlePelicanError(err, `nodes/${data.node}?include=allocations`));
        if (!nodePelican) return ctx.error('This node does not exist!');

        /* Retrieve the egg from Pelican */
        const eggPelican = await ctx.pelican.requestApplication(`eggs/${data.egg}?include=variables`).catch((err) => ctx.pelican.handlePelicanError(err, `eggs/${data.egg}?include=variables`));
        if (!eggPelican) return ctx.error('This egg does not exist!');

        /* Update data */
        data.userData = userPelican;
        data.nodeData = nodePelican;
        data.eggData = eggPelican;

        /* Get the discord user */
        let userDiscord = await ctx.database.table('users').select().where('userPelicanId', Number(data.user));
        userDiscord = userDiscord[0] ? ` for ${ctx.getMember(userDiscord[0].discordId) ? `${ctx.getMember(userDiscord[0].discordId).user.displayName} ` : ''}(\`${userDiscord[0].discordId}\`)` : '';

        const msg = await ctx.send({
            components: [this.displayMainComponents(ctx, data, userDiscord)],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { parse: [] }
        });

        const filter = (button) => button.user.id === ctx.user.id;
        const collectorButton = msg.createMessageComponentCollector({ filter, idle: 10 * 60 * 1000, componentType: 2 });

        collectorButton.on('collect', async (button) => {
            if (button.customId === 'button_server_details') {
                const date = Date.now();
                const modal = new ModalBuilder()
                    .setCustomId(`details_${date}`)
                    .setTitle(`Server details`)

                const textInputDescription = new TextInputBuilder()
                    .setCustomId('description_value')
                    .setStyle(2)
                    .setRequired(true)

                if (data.description) textInputDescription.setValue(data.description)

                const labelDescription = new LabelBuilder()
                    .setLabel(`Description of the server:`)
                    .setTextInputComponent(textInputDescription)

                modal.addLabelComponents(labelDescription)

                button.showModal(modal);

                const filter = (modal) => modal.customId === `details_${date}`;
                button.awaitModalSubmit({ filter, time : 5 * 60 * 1000 })
                    .catch(() => null)
                    .then(async (modal) => {
                        if (modal === undefined || modal === null) return
                        await modal.deferUpdate().catch(() => null);

                        const description = modal.fields.getTextInputValue('description_value');

                        // Update the cache
                        if (description !== '') data.description = description;
                        else data.description = null;

                        // Update the message
                        return button.message.edit({
                            components: [this.displayMainComponents(ctx, data, userDiscord)],
                            allowedMentions: { parse: [] }
                        }).catch(() => null);
                    });
            }
            else if (button.customId === 'button_server_features') {
                const date = Date.now();
                const modal = new ModalBuilder()
                    .setCustomId(`features_${date}`)
                    .setTitle(`Server features`)

                const textInputDatabase = new TextInputBuilder()
                    .setCustomId('database_value')
                    .setStyle(1)
                    .setRequired(true)
                    .setValue(String(data.database))

                const textInputBackup = new TextInputBuilder()
                    .setCustomId('backup_value')
                    .setStyle(1)
                    .setRequired(true)
                    .setValue(String(data.backup))

                const textInputAllocation = new TextInputBuilder()
                    .setCustomId('allocation_value')
                    .setStyle(1)
                    .setRequired(true)
                    .setValue(String(data.allocation))

                const labelDatabase = new LabelBuilder()
                    .setLabel(`Databases to allow:`)
                    .setTextInputComponent(textInputDatabase)

                const labelBackup = new LabelBuilder()
                    .setLabel(`Backups to allow:`)
                    .setTextInputComponent(textInputBackup)

                const labelAllocation = new LabelBuilder()
                    .setLabel(`Allocations to allow:`)
                    .setTextInputComponent(textInputAllocation)

                modal
                    .addLabelComponents(labelDatabase)
                    .addLabelComponents(labelBackup)
                    .addLabelComponents(labelAllocation)

                button.showModal(modal);

                const filter = (modal) => modal.customId === `features_${date}`;
                button.awaitModalSubmit({ filter, time : 5 * 60 * 1000 })
                    .catch(() => null)
                    .then(async (modal) => {
                        if (modal === undefined || modal === null) return
                        await modal.deferUpdate().catch(() => null);

                        const database = Number(modal.fields.getTextInputValue('database_value'));
                        const backup = Number(modal.fields.getTextInputValue('backup_value'));
                        const allocation = Number(modal.fields.getTextInputValue('allocation_value'));

                        // Check if the database is correct
                        if (isNaN(database) || database < 0 || database > 10) return modal.followUp({
                            content: `${ctx.emojiError} Databases must be a number between 0 and 10!`,
                            flags: MessageFlags.Ephemeral
                        });

                        // Check if the backup is correct
                        if (isNaN(backup) || backup < 0 || backup > 10) return modal.followUp({
                            content: `${ctx.emojiError} Backups must be a number between 0 and 10!`,
                            flags: MessageFlags.Ephemeral
                        });

                        // Check if the allocation is correct
                        if (isNaN(allocation) || allocation < 1 || allocation > 10) return modal.followUp({
                            content: `${ctx.emojiError} Allocations must be a number between 1 and 10!`,
                            flags: MessageFlags.Ephemeral
                        });

                        // Update the cache
                        data.database = database;
                        data.backup = backup;
                        data.allocation = allocation;

                        // Update the message
                        return button.message.edit({
                            components: [this.displayMainComponents(ctx, data, userDiscord)],
                            allowedMentions: { parse: [] }
                        }).catch(() => null);
                    });

            }
            else if (button.customId === 'button_server_limits') {
                const date = Date.now();
                const modal = new ModalBuilder()
                    .setCustomId(`limits_${date}`)
                    .setTitle(`Server limits`)

                const description = new TextDisplayBuilder()
                    .setContent(`> ⚠️ **Warning:** The limits are in percentage for the CPU and in megabytes for the memory and disk. Leave \`0\` if you don't want to limit the resource.`)

                const textInputCPU = new TextInputBuilder()
                    .setCustomId('cpu_value')
                    .setStyle(1)
                    .setRequired(true)
                    .setValue(String(data.cpu))

                const textInputMemory = new TextInputBuilder()
                    .setCustomId('memory_value')
                    .setStyle(1)
                    .setRequired(true)
                    .setValue(String(data.memory))

                const textInputDisk = new TextInputBuilder()
                    .setCustomId('disk_value')
                    .setStyle(1)
                    .setRequired(true)
                    .setValue(String(data.disk))

                const labelCPU = new LabelBuilder()
                    .setLabel(`CPU to allow:`)
                    .setTextInputComponent(textInputCPU)

                const labelMemory = new LabelBuilder()
                    .setLabel(`Memory to allow:`)
                    .setTextInputComponent(textInputMemory)

                const labelDisk = new LabelBuilder()
                    .setLabel(`Disk to allow:`)
                    .setTextInputComponent(textInputDisk)

                modal
                    .addTextDisplayComponents(description)
                    .addLabelComponents(labelCPU)
                    .addLabelComponents(labelMemory)
                    .addLabelComponents(labelDisk)

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

                        // Update the cache
                        data.cpu = cpu;
                        data.memory = memory;
                        data.disk = disk;

                        // Update the message
                        return button.message.edit({
                            components: [this.displayMainComponents(ctx, data, userDiscord)],
                            allowedMentions: { parse: [] }
                        }).catch(() => null);
                    });

            }
            else if (button.customId === 'button_finish') {
                await button.deferUpdate();

                // Disable buttons
                await button.message.edit({
                    components: ctx.messageFormatter.disableButtons(button.message.components, true),
                    allowedMentions: { parse: [] }
                }).catch(() => null);

                // Ask for confirmation
                const embedAsk = new EmbedBuilder()
                    .setDescription(`**Are you sure you want to confirm the creation of the server?**`)
                    .setColor(ctx.me.displayColor)

                const msgAsk = await button.channel.send({
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
                        components: [this.displayMainComponents(ctx, data, userDiscord)],
                        allowedMentions: { parse: [] }
                    }).catch(() => null);

                    /* Get all allocations */
                    let allocations = await ctx.pelican.requestApplication(`nodes/${data.node}/allocations`).catch((err) => ctx.pelican.handlePelicanError(err, `nodes/${data.node}/allocations`));

                    /* Get free allocations */
                    let freeAllocations = allocations.filter(a => !a.attributes.assigned);

                    /* Create missing allocations */
                    if (freeAllocations.length < data.allocation) {
                        const missing = data.allocation - freeAllocations.length;

                        /* Get biggest existing port */
                        let biggestPort = allocations.length
                            ? Math.max(...allocations.map(a => a.attributes.port))
                            : 2000;

                        for (let i = 0; i < missing; i++) {
                            biggestPort++;

                            await ctx.pelican.requestApplication(
                                `nodes/${data.node}/allocations`,
                                'post',
                                {
                                    ip: data.nodeData.attributes.relationships.allocations.data[0].attributes.ip,
                                    ports: [`${biggestPort}`],
                                }
                            ).catch((err) => {
                                ctx.pelican.handlePelicanError(err, `nodes/${data.node}/allocations`, 'post')
                                return button.followUp({ content: `${ctx.emojiError} An error occurred while creating an allocation!` });
                            });
                        }

                        /* Refresh allocations */
                        allocations = await ctx.pelican.requestApplication(`nodes/${data.node}/allocations`).catch((err) => ctx.pelican.handlePelicanError(err, `nodes/${data.node}/allocations`));

                        freeAllocations = allocations.filter(a => !a.attributes.assigned);
                    }

                    /* Keep the allocations that will be assigned to the server */
                    const serverAllocations = freeAllocations.slice(0, data.allocation).map(a => a.attributes.id);

                    /* Create the server */
                    try {
                        const server = await ctx.pelican.requestApplication(
                            `servers`,
                            'post',
                            {
                                name: data.name,
                                description: data.description,
                                user: data.user,
                                egg: data.egg,
                                docker_image: data.eggData.attributes.docker_image,
                                environment: data.eggData.attributes.relationships.variables.data.reduce((acc, variable) => {
                                    acc[variable.attributes.env_variable] = variable.attributes.default_value;
                                    return acc;
                                }, {}),
                                node: data.node,
                                start_on_completion: false,
                                limits: {
                                    memory: data.memory,
                                    swap: 0,
                                    disk: data.disk,
                                    io: 500,
                                    cpu: data.cpu
                                },
                                feature_limits: {
                                    databases: data.database,
                                    allocations: data.allocation,
                                    backups: data.backup
                                },
                                allocation: {
                                    default: serverAllocations[0],
                                    additional: serverAllocations.slice(1)
                                }
                            }
                        );

                        await button.message.edit({
                            components: [this.displayCreationComponents(ctx, false, server)],
                            allowedMentions: { parse: [] }
                        });

                        /* Waiting for the server to be created */
                        let statusServer = server.attributes.status;

                        while (statusServer === 'installing') {
                            await new Promise((r) => setTimeout(r, 10 * 1000));
                            const serverInfo = await ctx.pelican.requestApplication(`servers/${server.attributes.id}`).catch((err) => ctx.pelican.handlePelicanError(err, `servers/${server.attributes.id}`));
                            statusServer = serverInfo.attributes.status;
                        }

                        await button.message.edit({
                            components: [this.displayCreationComponents(ctx, true, server)],
                            allowedMentions: { parse: [] }
                        });

                        if (time) {
                            const timing = Date.now() + ms(`${time}d`);

                            /* Add to database */
                            await ctx.database.table('schedule_servers').insert({ serverId: server.attributes.id, time: timing });

                            schedule.scheduleJob(`${server.attributes.id}`, timing, async () => {
                                /* Suspend the server */
                                try {
                                    await ctx.pelican.requestApplication(`servers/${server.attributes.id}/suspend`, 'post');

                                    ctx.client.logger.warn(`Schedule Suspend Server: ${server.attributes.name} (${server.attributes.id})`);

                                    /* Delete it from database */
                                    await ctx.database.table('schedule_servers').delete().where('serverId', server.attributes.id);
                                } catch (err) {
                                    ctx.pelican.handlePelicanError(err, `servers/${server.attributes.id}/suspend`, 'post');

                                    ctx.client.logger.warn(`Schedule Suspend Server: An error occurred on ${server.attributes.name} (${server.attributes.id})`);
                                }
                            });
                        }
                    }
                    catch (err) {
                        ctx.pelican.handlePelicanError(err, `servers}`, 'post');
                        button.followUp({ content: `${ctx.emojiError} An error occurred while creating the server!` });
                    }
                });
            }
            else if (button.customId === 'button_cancel') {
                await button.deferUpdate();

                // Ask for confirmation
                const embedAsk = new EmbedBuilder()
                    .setDescription(`**Are you sure you want to cancel the creation of the server?**`)
                    .setColor(ctx.me.displayColor)

                const msgAsk = await button.channel.send({
                    embeds: [embedAsk],
                    components: ctx.messageFormatter.question()
                });

                const collectorAsk = msgAsk.createMessageComponentCollector({ filter, idle: 5 * 60 * 1000, componentType: 2, max: 1 });
                collectorAsk.on('collect', async (buttonConfirm) => {
                    await buttonConfirm.deferUpdate();
                    msgAsk.delete().catch(() => null);
                    collectorAsk.stop();

                    // If the user cancels the confirmation
                    if (buttonConfirm.customId !== 'yes') return
                    collectorButton.stop('idle');

                    return button.followUp({
                        content: `${ctx.emojiSuccess} ${`You have cancelled the creation of the server!`}`,
                        flags: MessageFlags.Ephemeral
                    });
                });
            }
        });

        collectorButton.on('end', (_, reason) => {
            if (reason === 'idle') return msg.edit({ components: ctx.messageFormatter.disableButtons(msg.components, true), allowedMentions: { parse: [] } }).catch(() => null);
        });
    }

    async runAutoComplete(ctx) {
        /* Get the focussed query */
        const focussedQuery = ctx.options.getFocused(true);

        if (focussedQuery.name === 'pelican-user') {
            if (focussedQuery.value === '') return ctx.inter.respond([{ name: "Write the first letter of the user", value: "nothing_found" }]);

            /* Search for the list of servers */
            try {
                const usersPelican = await ctx.pelican.requestApplication("users");
                if (usersPelican.length === 0) return ctx.inter.respond([{ name: "No user found", value: "nothing_found" }]);

                const res = usersPelican.filter(s => s.attributes.username.toLowerCase().includes(focussedQuery.value.toLowerCase())).map(s => ({ name: this.utils.capitalize(s.attributes.username), value: String(s.attributes.id) })).slice(0, 25);
                if (res.length === 0) return ctx.inter.respond([{ name: "No user found", value: "nothing_found" }]);

                return ctx.inter.respond(res);
            } catch (err) {
                ctx.pelican.handlePelicanError(err, 'users');
            }
        }
        else if (focussedQuery.name === 'node') {
            if (focussedQuery.value === '') return ctx.inter.respond([{ name: "Write the first letter of the node", value: "nothing_found" }]);

            /* Search for the list of nodes */
            try {
                const nodesPelican = await ctx.pelican.requestApplication("nodes");
                if (nodesPelican.length === 0) return ctx.inter.respond([{ name: "No node found", value: "nothing_found" }]);

                const res = nodesPelican.filter(s => s.attributes.name.toLowerCase().includes(focussedQuery.value.toLowerCase())).map(s => ({ name: s.attributes.name, value: String(s.attributes.id) })).slice(0, 25);
                if (res.length === 0) return ctx.inter.respond([{ name: "No node found", value: "nothing_found" }]);

                return ctx.inter.respond(res);
            } catch (err) {
                ctx.pelican.handlePelicanError(err, 'nodes');
            }
        }
        else if (focussedQuery.name === 'egg') {
            if (focussedQuery.value === '') return ctx.inter.respond([{ name: "Write the first letter of the egg", value: "nothing_found" }]);

            /* Search for the list of eggs */
            try {
                const eggsPelican = await ctx.pelican.requestApplication("eggs");
                if (eggsPelican.length === 0) return ctx.inter.respond([{ name: "No egg found", value: "nothing_found" }]);

                const res = eggsPelican.filter(s => s.attributes.name.toLowerCase().includes(focussedQuery.value.toLowerCase())).map(s => ({ name: s.attributes.name, value: String(s.attributes.id) })).slice(0, 25);
                if (res.length === 0) return ctx.inter.respond([{ name: "No egg found", value: "nothing_found" }]);

                return ctx.inter.respond(res);
            } catch (err) {
                ctx.pelican.handlePelicanError(err, 'eggs');
            }
        }
    }
}

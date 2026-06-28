const SlashCommand = require('../../../managers/structures/SlashCommands.js');
const { MessageFlags, ContainerBuilder, SeparatorSpacingSize, ButtonBuilder, EmbedBuilder } = require('discord.js');

module.exports = class ServerGet extends SlashCommand {
    constructor(handler) {
        super(handler,{
            name: 'server-get',
            description: 'Get a specific server from the pelican panel',
            description_localizations: {
                "fr": "Obtenir un serveur spécifique du panel pelican"
            },
            options: [{
                name: "server",
                description: "The server to get",
                description_localizations: {
                    "fr": "Le serveur à obtenir"
                },
                type: 3,
                required: true,
                autocomplete: true
            }],
            category: SlashCommand.Categories.ServerPelican,
            user_permissions: ['Administrator'],
            bot_permissions: ['EmbedLinks']
        });
    }

    /**
     * Display the server information in a container
     * @param ctx The command context
     * @param serverPelican The server to display
     * @param userPelican The user who owns the server
     * @param discordInfo The discord user linked to the server
     * @param nodePelican The node where the server is hosted
     * @param eggPelican The egg used to install the server
     * @param reinstall If the server is being reinstalled
     * @return {Promise<ContainerBuilder>}
     */
    async displayComponents(ctx, serverPelican, userPelican, discordInfo, nodePelican, eggPelican, reinstall = false) {
        return new ContainerBuilder()
            .setAccentColor(ctx.me.displayColor)
            .addTextDisplayComponents(t => t.setContent(`# ✳️ Server ${serverPelican.attributes.name}`))
            .addSeparatorComponents(s => s.setDivider(true).setSpacing(SeparatorSpacingSize.Large))
            .addTextDisplayComponents(
                t => t.setContent([
                    "## 👤 Server details",
                    `> ✏️ **Name:** ${serverPelican.attributes.name}`,
                    `> 💬 **Description:** ${serverPelican.attributes.description ? serverPelican.attributes.description : '\`-\`'}`,
                    `> 🆔 **ID:** \`${serverPelican.attributes.id}\``,
                    `> 📅 **Created at:** <t:${Math.round(new Date(serverPelican.attributes.created_at).getTime()/ 1000).toFixed()}:d>`,
                    `> ⛔ **Suspended :** \`${serverPelican.attributes.suspended ? ctx.emojiSuccess : ctx.emojiError}\``,
                    `> 🪪 **Owner:** ${this.utils.capitalize(userPelican.attributes.username)}`,
                    `> 💬 **Discord:** ${discordInfo}`
                ].join("\n")),
                t => t.setContent(
                    [
                        "## ✳️ Server features",
                        `> 📟 **Node:** ${nodePelican ? nodePelican.attributes.name : `\`${serverPelican.attributes.node}\` (Not found)` }`,
                        `> 🥚 **Egg** ${eggPelican ? eggPelican.attributes.name : `\`${serverPelican.attributes.egg}\` (Not found)` }`,
                        `> 🗄️ **Database:** \`${serverPelican.attributes.feature_limits.databases === 0 ? '-' : serverPelican.attributes.feature_limits.databases}\``,
                        `> 💾 **Backup:** \`${serverPelican.attributes.feature_limits.backups === 0 ? '-' : serverPelican.attributes.feature_limits.backups}\``,
                        `> 🌐 **Allocation:** \`${serverPelican.attributes.feature_limits.allocations === 0 ? '-' : serverPelican.attributes.feature_limits.allocations}\``
                    ].join("\n")),
                t => t.setContent(
                    [
                        "## ⚙️ Server limits",
                        `> ♾️ **CPU:** \`${serverPelican.attributes.limits.cpu}%\``,
                        `> 🧠 **Memory:** \`${ctx.utils.formatMegabytes(serverPelican.attributes.limits.memory)}\``,
                        `> 💽 **Disk** \`${ctx.utils.formatMegabytes(serverPelican.attributes.limits.disk)}\``
                    ].join("\n"))
            )
            .addSeparatorComponents(s => s.setDivider(true).setSpacing(SeparatorSpacingSize.Large))
            .addActionRowComponents(r => r.addComponents(
                new ButtonBuilder()
                    .setStyle(5)
                    .setLabel('View on Pelican')
                    .setURL(`${ctx.config["pelican"]["url"].endsWith("/") ? ctx.config["pelican"]["url"].slice(0, -1) : ctx.config["pelican"]["url"]}/admin/servers/${serverPelican.attributes.id}/edit`),
                new ButtonBuilder()
                    .setCustomId(`reinstall`)
                    .setLabel('Reinstall')
                    .setEmoji('🔄')
                    .setStyle(4)
                    .setDisabled(reinstall)
            ))
    }

    async run (ctx) {
        const serverPelicanId = Number(ctx.options.getString('server'));

        /* Check if this pelican server exists */
        try {
            const serverPelican = await ctx.pelican.requestApplication(`servers/${serverPelicanId}?include=user`);
            if (!serverPelican) return ctx.error('This server does not exist!');

            /* Get the discord user registered */
            let discordInfo = await ctx.database.table('users').first().where('userPelicanId', Number(serverPelican.attributes.relationships.user.attributes.id));
            discordInfo = discordInfo ? `<@${discordInfo.discordId}> (\`${discordInfo.discordId}\`)` : '\`Not linked\`';

            /* Retrieve the node from Pelican */
            const nodePelican = await ctx.pelican.requestApplication(`nodes/${serverPelican.attributes.node}`).catch((err) => ctx.pelican.handlePelicanError(err, `nodes/${serverPelican.attributes.node}`));

            /* Retrieve the egg from Pelican */
            const eggPelican = await ctx.pelican.requestApplication(`eggs/${serverPelican.attributes.egg}`).catch((err) => ctx.pelican.handlePelicanError(err, `eggs/${serverPelican.attributes.egg}`));

            const userPelican = serverPelican.attributes.relationships.user;

            const msg = await ctx.send({
                components: [await this.displayComponents(ctx, serverPelican, userPelican, discordInfo, nodePelican, eggPelican)],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { parse: [] }
            });

            const filter = (button) => button.user.id === ctx.user.id;
            const collectorButton = msg.createMessageComponentCollector({ filter, idle: 5 * 60 * 1000, componentType: 2});

            collectorButton.on('collect', async (button) => {
                await button.deferUpdate();
                if (button.customId === 'reinstall') {
                    // Disable buttons
                    await button.message.edit({
                        components: ctx.messageFormatter.disableButtons(button.message.components, true),
                        allowedMentions: { parse: [] }
                    }).catch(() => null);

                    /* Ask for confirmation */
                    const embedAsk = new EmbedBuilder()
                        .setDescription(`**Are you sure you want to reinstall the server \`${serverPelican.attributes.name}\`?**`)
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
                            components: [await this.displayComponents(ctx, serverPelican, userPelican, discordInfo, nodePelican, eggPelican)],
                            allowedMentions: { parse: [] }
                        }).catch(() => null);

                        await ctx.pelican.requestApplication(`servers/${serverPelicanId}/reinstall`, 'post').catch((err) => ctx.pelican.handlePelicanError(err, `servers/${serverPelicanId}/reinstall`));

                        button.message.edit({
                            components: [await this.displayComponents(ctx, serverPelican, userPelican, discordInfo, nodePelican, eggPelican, true)],
                            allowedMentions: { parse: [] }
                        }).catch(() => null);

                        return button.followUp({ content: `${ctx.emojiSuccess} The server is being reinstalled!` });
                    });
                }

            });
        } catch (err) {
            ctx.pelican.handlePelicanError(err, `servers/${serverPelicanId}`);
            return ctx.error('An error occurred while trying to get a server from Pelican!');
        }
    }

    async runAutoComplete(ctx) {
        /* Get the focussed query */
        const focussedQuery = ctx.options.getFocused();
        if (!focussedQuery) return ctx.inter.respond([{ name: "Write the first letter of the server", value: "nothing_found" }]);

        /* Search for the list of servers */
        try {
            const serversPelican = await ctx.pelican.requestApplication("servers");

            if (serversPelican.length === 0) return ctx.inter.respond([{ name: "No server found", value: "nothing_found" }]);

            const res = serversPelican.filter(s => s.attributes.name.toLowerCase().includes(focussedQuery.toLowerCase())).map(s => ({ name: s.attributes.name, value: String(s.attributes.id) })).slice(0, 25);
            if (res.length === 0) return ctx.inter.respond([{ name: "No server found", value: "nothing_found" }]);

            return ctx.inter.respond(res);
        } catch (err) {
            ctx.pelican.handlePelicanError(err, '/servers');
        }
    }
}

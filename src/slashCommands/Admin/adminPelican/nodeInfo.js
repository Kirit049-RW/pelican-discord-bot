const SlashCommand = require('../../../managers/structures/SlashCommands.js');
const { ButtonBuilder, MessageFlags, ContainerBuilder, SeparatorSpacingSize } = require('discord.js');

module.exports = class NodeInfo extends SlashCommand {
    constructor(handler) {
        super(handler,{
            name: 'node-info',
            description: 'Get information about a node on the pelican panel',
            description_localizations: {
                "fr": "Obtenir des informations sur un nœud du panneau pelican"
            },
            options: [{
                name: 'node',
                description: 'Node to get information about',
                description_localizations: {
                    "fr": "Nœud où avoir des informations"
                },
                type: 3,
                required: true,
                autocomplete: true
            }],
            category: SlashCommand.Categories.AdminPelican,
            user_permissions: ['Administrator']
        });
    }

    async run (ctx) {
        const nodeId = Number(ctx.options.getString('node'))

        /* Retrieve the node from Pelican */
        const nodePelican = await ctx.pelican.requestApplication(`nodes/${nodeId}?include=allocations,servers`).catch((err) => ctx.pelican.handlePelicanError(err, `nodes/${nodeId}?include=allocations,servers`));
        if (!nodePelican) return ctx.error('This node does not exist!');

        /* Retrieve the node config from Pelican */
        const nodeConfigPelican = await ctx.pelican.requestApplication(`nodes/${nodeId}/configuration`).catch((err) => ctx.pelican.handlePelicanError(err, `nodes/${nodeId}/configuration`));

        /* Retrieve information from wings */
        let wingsServers;
        let wingsSystem;

        try {
            wingsServers = await ctx.pelican.requestWings('servers', nodePelican, nodeConfigPelican.token);
            wingsSystem = await ctx.pelican.requestWings('system', nodePelican, nodeConfigPelican.token);
        } catch (err) {
            ctx.pelican.handlePelicanError(err, `wings/servers & wings/system`);

            wingsServers = [];
            wingsSystem = null;
        }

        const nodeUsages = {
            cpu: 0,
            memory: 0,
            disk: 0,
            network_tx: 0,
            network_rx: 0,
            allocations: 0,
            onlineServers: 0,
            suspendedServers: 0
        };

        for (const server of wingsServers) {
            const usage = server.utilization;

            nodeUsages.cpu += usage.cpu_absolute || 0;
            nodeUsages.memory += usage.memory_bytes || 0;
            nodeUsages.disk += usage.disk_bytes || 0;
            nodeUsages.network_tx += usage.network.tx_bytes || 0;
            nodeUsages.network_rx += usage.network.rx_bytes || 0;

            const mappings = server.configuration?.allocations?.mappings;
            if (mappings) {
                nodeUsages.allocations += Object.values(mappings).reduce((sum, arr) => sum + arr.length, 0) || 0;
            }

            if (server.state === 'running') {
                nodeUsages.onlineServers += 1;
            }

            if (server.is_suspended) {
                nodeUsages.suspendedServers += 1;
            }
        }

        // Adapt to cores the CPU
        if (wingsSystem && wingsSystem.cpu_count && wingsSystem.cpu_count > 0) {
            nodeUsages.cpu = nodeUsages.cpu / wingsSystem.cpu_count || 0;
        }

        const cpuCount = wingsSystem?.cpu_count || 'N/A';
        const cpuLabel = cpuCount !== 'N/A' ? `**CPU Usage (${cpuCount}c):**` : '**CPU Usage:**';

        const container = new ContainerBuilder()
            .setAccentColor(this.utils.embedColorFromWingsStatus(wingsSystem ? "online" : "offline"))
            .addTextDisplayComponents(text =>
                text.setContent([
                    "## 🌐 General information",
                    `> 🖥️ **Name:** ${nodePelican.attributes.name}`,
                    `> 🆔 **ID:** \`${nodePelican.attributes.id}\``,
                    `> ${wingsSystem ? "🟢" : "🔴"} **Wings Status:** ${wingsSystem ? "Online" : "Offline"}`,
                    `> 🪽 **Wings Version:** ${wingsSystem ? wingsSystem.version : "N/A"}`,
                    `> 🔧 **Maintenance:** ${nodePelican.attributes.maintenance_mode ? `${ctx.emojiSuccess}` : `${ctx.emojiError}`}`,
                    `> 📅 **Created at:** <t:${Math.round(new Date(nodePelican.attributes.created_at).getTime() / 1000).toFixed()}:d>`,
                    `> 🌍 **FQDN:** \`${nodePelican.attributes.fqdn}\``,
                    `> 🔗 **SFTP Host:** \`${nodePelican.attributes.daemon_sftp_alias}\``,
                    `> 📂 **SFTP Port:** \`${nodePelican.attributes.daemon_sftp}\``
                ].join("\n"))
            )
            .addTextDisplayComponents(text =>
                text.setContent([
                    "## ❇️ Node activity",
                    `> 📦 **Allocations:** \`${nodeUsages.allocations}/${nodePelican.attributes.relationships.allocations.data.length || 0}\``,
                    `> 🖥️ **Servers Running:** \`${nodeUsages.onlineServers}/${wingsServers.length}\``,
                    `> 🖥️ **Servers Suspended:** \`${nodeUsages.suspendedServers}/${wingsServers.length}\``
                ].join("\n"))
            )
            .addTextDisplayComponents(text =>
                text.setContent([
                    "## ⚙️ Resource usage",
                    `> ♾️ ${cpuLabel} \`${nodeUsages.cpu.toFixed(2)}%\``,
                    `> 🧠 **Memory:** \`${this.utils.formatBytes(nodeUsages.memory)}/${this.utils.formatMegabytes(nodePelican.attributes.memory)}\``,
                    `> 💽 **Disk:** \`${this.utils.formatBytes(nodeUsages.disk)}/${this.utils.formatMegabytes(nodePelican.attributes.disk)}\``,
                    `> ⬆️ **Upload:** \`${this.utils.formatBytes(nodeUsages.network_tx)}\``,
                    `> ⬇️ **Download:** \`${this.utils.formatBytes(nodeUsages.network_rx)}\``
                ].join("\n"))
            )

        if (wingsServers.length > 0) {
            wingsServers.sort((a, b) => a.configuration.meta.name.localeCompare(b.configuration.meta.name));

            let serverListText = wingsServers.map(server => {
                const emoji = this.utils.serverPowerEmojiOnly(server.state);
                let name = server.configuration.meta.name;

                if (name.length > 32) {
                    name = name.slice(0, 29) + '...';
                }
                return `${emoji} ➜ ${name}`;
            }).join('\n');

            serverListText = `\`\`\`${serverListText}\`\`\`` || 'No servers found for this node.';

            if (serverListText.length > 1024) {
                serverListText = serverListText.slice(0, 1021) + '...';
            }

            container.addTextDisplayComponents(text =>
                text.setContent([
                    "## ✳️ Servers",
                    `${serverListText}`
                ].join("\n"))
            )
        }

        container
            .addSeparatorComponents(s => s.setDivider(true).setSpacing(SeparatorSpacingSize.Large))
            .addActionRowComponents(r => r.addComponents(
                new ButtonBuilder()
                    .setStyle(5)
                    .setLabel('View on Pelican')
                    .setURL(`${ctx.config["pelican"]["url"].endsWith("/") ? ctx.config["pelican"]["url"].slice(0, -1) : ctx.config["pelican"]["url"]}/admin/nodes/${nodePelican.attributes.id}/edit`)
            ))

        ctx.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    async runAutoComplete(ctx) {
        /* Get the focussed query */
        const focussedQuery = ctx.options.getFocused(true);
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
}

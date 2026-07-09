const { CronJob } = require('cron');
const { EmbedBuilder, ButtonBuilder, ActionRowBuilder } = require('discord.js');

module.exports = class MonitorAdminServersStatus {
    constructor(event) {
        this.client = event.client
        this.config = event.config
        this.database = event.database
        this.pelican = event.pelican
        this.running = false;
    }

    async adminServers() {
        if (this.running) return;

        this.running = true;

        try {
            /* Get the servers monitoring in database */
            const servers = await this.database.table('monitoring_admin_servers').select();
            if (!servers[0]) return;

            const results = await Promise.allSettled(
                servers.map(server => this.checkAdminServer(server))
            );

            /* If needed to log the results and potential errors in the console for debugging purposes */
            //console.dir(results, { depth: null });
        } finally {
            this.running = false;
        }
    }

    async checkAdminServer(server) {
        /* Get the server ID */
        const serverId = server.serverId;

        /* Get the user from the database */
        const userDatabase = await this.database.table('users').select().where('discordId', server.userId);
        if (!userDatabase[0]) return;


        /* Make the request to pelican API */
        const resourcesPelican = await this.pelican.requestClient(`servers/${serverId}/resources`, userDatabase[0].apiKey).catch((err) => this.pelican.handlePelicanError(err, `servers/${serverId}/resources`));

        /* If the server is not found, continue */
        if (!resourcesPelican) return;

        /* Get the server from Pelican */
        const serverPelican = await this.pelican.requestClient(`servers/${serverId}`, userDatabase[0].apiKey).catch((err) => this.pelican.handlePelicanError(err, `servers/${serverId}`));

        /* Get the state of the server */
        const state = resourcesPelican.attributes.current_state;

        /* If the state is not online or offline, continue */
        if (!['online', 'offline'].includes(state)) return;

        /* Check if we need to notify the users */
        const shouldNotify = state === 'offline';

        /* If the server is already notified, continue */
        if (Boolean(server.isNotified) === shouldNotify) return;

        const embed = new EmbedBuilder()
            .setColor(shouldNotify ? 0xFF0000 : 0x00FF00)
            .setTitle(`Server ${state === 'offline' ? 'Offline' : 'Online'}`)
            .setDescription(`The server ${serverPelican ? `**${serverPelican.attributes.name}**` : `with ID \`${serverId}\`` } is now **${state.toUpperCase()}**.`)
            .setFooter({ text: 'You receive this message because you have been added to the monitoring of this server.', iconURL: this.client.user.displayAvatarURL() })

        const buttonLink = new ButtonBuilder()
            .setLabel('View on Pelican')
            .setStyle(5)
            .setURL(`${this.config["pelican"]["url"].endsWith("/") ? this.config["pelican"]["url"].slice(0, -1) : this.config["pelican"]["url"]}/server/${serverId}`)

        const actionRow = new ActionRowBuilder()
            .addComponents(buttonLink)

        /* Get the notification type */
        const type = server.type;

        /* For private message */
        if (type === 'private_message' || type === 'all') {
            /* Get the user */
            const user = await this.client.users.fetch(server.userId).catch(() => null);

            /* Send a private message to the user */
            if (user) await user.send({ embeds: [embed], components: [actionRow] }).catch(() => null);
        }

        /* For channel */
        if (type === 'channel' || type === 'all') {
            /* Get the channel */
            const channel = await this.client.channels.fetch(server.channelId).catch(() => null);

            if (channel?.isTextBased()) channel.send({ embeds: [embed], components: [actionRow] }).catch(() => null);
        }

        /* Update the server in database */
        await this.database.table('monitoring_admin_servers')
            .where({ serverId })
            .update({ isNotified: shouldNotify });
    }

    async handle () {
        /* Check servers right now */
        await this.adminServers();

        /* Check servers every 5 minutes */
        const job = new CronJob('*/5 * * * *', async () => await this.adminServers(), null, true, 'Europe/Paris');

        /* Start the cron job */
        job.start();
    }
}
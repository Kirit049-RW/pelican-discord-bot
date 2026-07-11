const Events = require('../../managers/structures/Events');

const CronSuspendServer = require('../../services/Cron/SuspendServers');
const MonitorServersStatus = require('../../services/Cron/MonitorServersStatus');
const MonitorAdminServersStatus = require('../../services/Cron/MonitorAdminServersStatus');

module.exports = class Ready extends Events {
    constructor (client) {
        super(client, 'clientReady')
        this.cronSuspendServer = new CronSuspendServer(this);
        this.monitorServersStatus = new MonitorServersStatus(this);
        this.monitorAdminServersStatus = new MonitorAdminServersStatus(this);
    }

    async handle () {
        this.logger.ready(this.client.user.displayName + ' is connected!');
        await this.client.user.setStatus('online');
        await this.client.user.setActivity(`🚀 Powering your Pelican panel`, { type: 3 });

        /* Cron suspend server */
        await this.cronSuspendServer.handle();

        /* Cron monitor server status */
        await this.monitorServersStatus.handle();

        /* Cron monitor admin server status */
        await this.monitorAdminServersStatus.handle();
    }
}
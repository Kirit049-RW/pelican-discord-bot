const Events = require('../../managers/structures/Events');

const CronSuspendServer = require('../../services/Cron/SuspendServers');
const MonitorServersStatus = require('../../services/Cron/MonitorServersStatus');

module.exports = class Ready extends Events {
    constructor (client) {
        super(client, 'clientReady')
        this.cronSuspendServer = new CronSuspendServer(this);
        this.monitorServersStatus = new MonitorServersStatus(this);
    }

    async handle () {
        this.logger.ready(this.client.user.displayName + ' is connected!');
        await this.client.user.setStatus('online');
        await this.client.user.setActivity(`Pelican`, { type: 3 });

        /* Cron suspend server */
        await this.cronSuspendServer.handle();

        /* Cron monitor server status */
        await this.monitorServersStatus.servers();
    }
}
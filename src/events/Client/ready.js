const Events = require('../../managers/structures/Events');

const CronSuspendServer = require('../../services/Cron/SuspendServers');

module.exports = class Ready extends Events {
    constructor (client) {
        super(client, 'clientReady')
        this.cronSuspendServer = new CronSuspendServer(this);
    }

    async handle () {
        this.logger.ready(this.client.user.displayName + ' is connected!');
        await this.client.user.setStatus('online');
        await this.client.user.setActivity(`Pelican`, { type: 3 });

        /* Cron suspend server */
        await this.cronSuspendServer.handle();
    }
}
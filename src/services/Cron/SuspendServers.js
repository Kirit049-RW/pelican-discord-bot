const schedule = require('node-schedule');

module.exports = class SuspendServers {
    constructor(event) {
        this.logger = event.logger
        this.database = event.database
        this.utils = event.utils
        this.pelican = event.pelican
    }

    async handle() {
        await this.utils.sleep(5 * 1000);
        const data = await this.database.table('schedule_servers').select();

        for (let i = 0; i < data.length; i++) {
            const timing = data[i].time;

            if (timing > Date.now()) {
                /* Check if this pelican server exists */
                const serverPelican = await this.pelican.requestApplication(`servers/${data[i].serverId}`).catch((err) => this.pelican.handlePelicanError(err, `servers/${data[i].serverId}`));
                if (!serverPelican) {
                    await this.database.table('schedule_servers').delete().where('serverId', data[i].serverId);
                    continue;
                }

                schedule.scheduleJob(`${serverPelican.attributes.id}`, timing, async () => {
                    /* Suspend the server */
                    try {
                        await this.pelican.requestApplication(`servers/${serverPelican.attributes.id}/suspend`, 'post');

                        this.logger.warn(`Schedule Suspend Server: ${serverPelican.attributes.name} (${serverPelican.attributes.id})`);

                        /* Delete it from database */
                        await this.database.table('schedule_servers').delete().where('serverId', serverPelican.attributes.id);
                    } catch (err) {
                        this.pelican.handlePelicanError(err, `servers/${serverPelican.attributes.id}/suspend`, 'post');

                        this.logger.warn(`Schedule Suspend Server: An error occurred on ${serverPelican.attributes.name} (${serverPelican.attributes.id})`);
                    }
                });
            }
            else {
                await this.database.table('schedule_servers').delete().where({ time: data[i].time });
            }
        }
    }
}
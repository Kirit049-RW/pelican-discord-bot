module.exports = class Knex {
    constructor(client) {
        this.client = client;
        this.config = client.config;
    }

    table (tableName) {
        return this.knex(tableName);
    }

    async loadDatabase() {
        this.knex = require('knex')(this.config['database']);

        this.knex.raw("SELECT VERSION()").then(
            (version) => console.log((version[0][0]))
        ).catch((err) => { console.log( err); throw err })
            .finally(() => {});

        this.client.once('clientReady', async () => {await this.checkAndUpdate();});
    }

    async checkAndUpdate () {
        /* Link Discord user to Pelican user */
        const hasTableUsers = await this.knex.schema.hasTable("users");
        if (!hasTableUsers) await this.knex.schema.createTable('users', function(t) {
            t.increments('id').notNullable().primary();
            t.string('discordId', 20);
            t.integer('userPelicanId', 20);
            t.string('apiKey', 500).defaultTo(null);
        });

        /* Discord bots to monitor */
        const hasTableDiscordBotsMonitoring = await this.knex.schema.hasTable("monitoring_discord_bot");
        if (!hasTableDiscordBotsMonitoring) await this.knex.schema.createTable('monitoring_discord_bot', function(t) {
            t.increments('id').notNullable().primary();
            t.string('botId', 20);
            t.bigInteger('createdAt');
        });

        /* Pelican Servers to monitor */
        const hasTableServersMonitoring = await this.knex.schema.hasTable("monitoring_servers");
        if (!hasTableServersMonitoring) await this.knex.schema.createTable('monitoring_servers', function(t) {
            t.increments('id').notNullable().primary();
            t.string('serverId', 20);
            t.string('discordId', 20);
            t.json('usersId').defaultTo('[]');
            t.boolean('isNotified').defaultTo(false);
        });

        /* Pelican Admin Servers to monitor */
        const hasTableAdminServersMonitoring = await this.knex.schema.hasTable("monitoring_admin_servers");
        if (!hasTableAdminServersMonitoring) await this.knex.schema.createTable('monitoring_admin_servers', function(t) {
            t.increments('id').notNullable().primary();
            t.string('serverId', 20);
            t.string('userId', 20); // who added the bot to the monitoring
            t.string('discordId', 20); // the owner of the server for next feature to monitor resources
            t.string('channelId', 20);
            t.string('type', 20);
            t.boolean('isNotified').defaultTo(false);
        });

        /* Schedule to suspend server */
        const hasTableSuspend = await this.knex.schema.hasTable("schedule_servers");
        if (!hasTableSuspend) await this.knex.schema.createTable('schedule_servers', function(t) {
            t.increments('id').notNullable().primary();
            t.integer('serverId', 20);
            t.bigInteger('time');
        });
    }
}

const SlashCommand = require('../../../managers/structures/SlashCommands.js');
const { EmbedBuilder } = require('discord.js');

module.exports = class MonitoringServers extends SlashCommand {
    constructor(handler) {
        super(handler,{
            name: 'monitoring-servers',
            description: 'Manage the servers monitored',
            options: [{
                name: 'add',
                description: 'Add a server to the monitoring',
                description_localizations: {
                    "fr": "Ajouter un serveur à la surveillance"
                },
                type: 1,
                options: [{
                    name: "server",
                    description: "The server to monitor",
                    description_localizations: {
                        "fr": "Le serveur à surveiller"
                    },
                    type: 3,
                    required: true,
                    autocomplete: true
                }, {
                    name: 'notification',
                    description: 'Way to receive notifications',
                    description_localizations: {
                        "fr": "Façon de recevoir les notifications"
                    },
                    type: 3,
                    required: true,
                    choices: [
                        {
                            name: 'Private message',
                            name_localizations: {
                                "fr": "Message privé"
                            },
                            value: 'private_message'
                        }, {
                            name: 'Channel',
                            name_localizations: {
                                "fr": "Salon"
                            },
                            value: 'channel'
                        }, {
                        name: 'All',
                            name_localizations: {
                                "fr": "Tout"
                            },
                        value: 'all'
                        }
                    ]
                }, {
                    name: 'channel',
                    description: 'The channel to send the notifications (if you choose "Channel" in the previous option)',
                    description_localizations: {
                        "fr": "Le salon pour envoyer les notifications (si vous choisissez \"Salon\" dans l'option précédente)"
                    },
                    type: 7,
                    channel_types: [0, 5],
                    required: false
                }]
            }, {
                name: 'list',
                description: 'Display the list of all servers monitored',
                description_localizations: {
                    "fr": "Afficher la liste des serveurs surveillés"
                },
                type: 1
            }, {
                name: 'remove',
                description: 'Remove a server from the monitoring',
                description_localizations: {
                    "fr": "Retirer un serveur de la surveillance"
                },
                type: 1,
                options: [{
                    name: "server-id",
                    description: "The server ID to remove",
                    description_localizations: {
                        "fr": "L'ID du serveur à retirer"
                    },
                    type: 4,
                    required: true
                }]
            }],
            category: SlashCommand.Categories.Admin,
            user_permissions: ['Administrator']
        });
    }

    async run (ctx) {
        const subCommand = ctx.options.getSubcommand();

        /* Get the user from the database */
        const userDatabase = await ctx.database.table('users').select().where('discordId', ctx.user.id);

        if (!userDatabase[0]) {
            /* Get the slashCommands in the rest api */
            const applicationCommands = await ctx.guild.commands.fetch();

            /* Get link or apikey command */
            const ApiKeyCommand = applicationCommands.find((c) => c.name === 'api-key') ? `</api-key add:${applicationCommands.find((c) => c.name === 'api-key').id}>` : `\`api-key add\``;
            return ctx.error(`You don't have registered your api key yet! Please use ${ApiKeyCommand} to register it.`);
        }

        if (subCommand === 'add') {
            const serverPelicanId = ctx.options.getString('server');
            const notification = ctx.options.getString('notification');
            const channel = ctx.options.getChannel('channel') || null;

            /* Check if a channel is specified */
            if (['channel', 'all'].includes(notification) && !channel) return ctx.error('You must specify a channel!');

            /* Get the server monitoring in database */
            const serverMonitor = await ctx.database.table('monitoring_admin_servers').first().where({ serverId: serverPelicanId });

            /* Check if this pelican server exists */
            try {
                const serverPelican = await ctx.pelican.requestClient(`servers/${serverPelicanId}`, userDatabase[0].apiKey);
                if (!serverPelican) return ctx.error('This server does not exist or you don\'t have access to it!');

                if (serverMonitor) {
                    /* Update the server in the database */
                    await ctx.database.table('monitoring_admin_servers').update({
                        type: notification,
                        channelId: channel ? channel.id : null
                    }).where({ serverId: serverPelicanId });
                }
                else {
                    /* Add the server to the database */
                    await ctx.database.table('monitoring_admin_servers').insert({
                        serverId: serverPelicanId,
                        userId: ctx.user.id,
                        type: notification,
                        channelId: channel ? channel.id : null
                    });
                }

                /* Send the success message */
                ctx.send({ content: `${ctx.emojiSuccess} The server **${ctx.utils.capitalize(serverPelican.attributes.name)}** has been ${serverMonitor ? 'updated' : 'added'} to the monitoring!` });
            } catch (err) {
                ctx.pelican.handlePelicanError(err, `servers/${serverPelicanId}`);
                return ctx.error('An error occurred while trying to get a server from Pelican!');
            }
        }
        else if (subCommand === 'list') {
            /* Get the server monitoring in database */
            const serverMonitor = await ctx.database.table('monitoring_admin_servers').select();
            if (!serverMonitor[0]) return ctx.error('There is no server monitored!');

            const data = await Promise.allSettled(
                serverMonitor.map(async (m) => {
                    const memberAdded = ctx.getMember(m.userId);

                    const serverPelican = await ctx.pelican
                        .requestClient(`servers/${m.serverId}`, userDatabase[0].apiKey)
                        .catch(err => ctx.pelican.handlePelicanError(err, `servers/${m.serverId}`));

                    return `• ${serverPelican ? `**${ctx.utils.capitalize(serverPelican.attributes.name)}** (\`${m.serverId}\`)` : `\`${m.serverId}\``} ➜ By ${memberAdded ? `**${memberAdded.displayName}**` : `\`${m.userId}\``} in **${m.type === 'all' ? 'Private Message & Channel' : ctx.utils.capitalize(m.type)}**${m.channelId ? ` in <#${m.channelId}>` : ''}`;
                })
            );

            const embed = new EmbedBuilder()
                .setTitle('List of monitored servers')
                .setColor(ctx.me.displayHexColor)
                .setThumbnail(ctx.me.displayAvatarURL())
                .setDescription(data
                    .filter(result => result.status === 'fulfilled')
                    .map(result => result.value)
                    .join('\n')
                )

            ctx.send({ embeds: [embed] });
        }
        else if (subCommand === 'remove') {
            const serverPelicanId = ctx.options.getInteger('server-id');

            /* Get the server monitoring in database */
            const serverMonitor = await ctx.database.table('monitoring_admin_servers').first().where({ serverId: serverPelicanId });
            if (!serverMonitor) return ctx.error('This server is not monitored!');

            /* Delete the server monitoring in database */
            await ctx.database.table('monitoring_admin_servers').delete().where({ serverId: serverPelicanId });

            /* Send the success message */
            ctx.send({ content: `${ctx.emojiSuccess} The server has been removed from the monitoring!` });
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

            const res = serversPelican.filter(s => s.attributes.name.toLowerCase().includes(focussedQuery.toLowerCase())).map(s => ({ name: ctx.utils.capitalize(s.attributes.name), value: String(s.attributes.identifier) })).slice(0, 25);
            if (res.length === 0) return ctx.inter.respond([{ name: "No server found", value: "nothing_found" }]);

            return ctx.inter.respond(res);
        } catch (err) {
            ctx.pelican.handlePelicanError(err, 'servers');
        }
    }
}

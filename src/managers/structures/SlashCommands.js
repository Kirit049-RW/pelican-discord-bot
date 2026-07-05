module.exports = class SlashCommand {
    constructor(handler, opts = {}) {
        this.handler = handler;

        this.name = (opts.name || '');
        this.name_localizations = (opts.name_localizations || {});
        this.description = (opts.description || {});
        this.description_localizations = (opts.description_localizations || {});
        this.type = (opts.type || null);
        this.dm_permission = (opts.dm_permission || false);
        this.options = (opts.options || []);

        this.disableSlash = (opts.disableSlash || false);
        
        this.category = (opts.category || SlashCommand.Categories.Misc);
        this.user_permissions = (opts.user_permissions || []);
        this.bot_permissions = (opts.bot_permissions || []);
    }

    static get Categories () {
        return {
            Misc : {
                id: 1,
                name : {
                    "fr" : "Divers",
                    "en-GB" : "Misc"
                },
                emoji: "⭐"
            },
            AdminPelican : {
                id: 2,
                name : {
                    "fr" : "Administrateur Pelican",
                    "en-GB" : "Pelican Admin"
                },
                emoji: "🛠️"
            },
            ServerPelican : {
                id: 3,
                name : {
                    "fr" : "Serveur Pelican",
                    "en-GB" : "Pelican Server"
                },
                emoji: "📡"
            },
            UserPelican : {
                id: 4,
                name : {
                    "fr" : "Utilisateur Pelican",
                    "en-GB" : "Pelican User"
                },
                emoji: "👤"
            },
            Admin : {
                id: 5,
                name : {
                    "fr" : "Administrateur",
                    "en-GB" : "Administrator"
                },
                emoji: "🔒"
            }
        }
    }

    get client () {
        return this.handler.client
    }

    get config () {
        return this.client.config
    }

    get utils() {
        return this.client.functions;
    }
}

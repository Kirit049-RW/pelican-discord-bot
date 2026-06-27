const SlashCommand = require('../../managers/structures/SlashCommands.js');
const { EmbedBuilder } = require('discord.js');

module.exports = class HelpSFTP extends SlashCommand {
    constructor(handler) {
        super(handler,{
            name: 'help-sftp',
            description: 'Get help to config the SFTP',
            description_localizations: {
                "fr": "Obtenir de l'aide pour configurer le SFTP"
            },
            category: SlashCommand.Categories.Misc,
            bot_permissions: ['EmbedLinks']
        });
    }

    async run (ctx) {
        const embed = new EmbedBuilder()
            .setAuthor({name: "SFTP connection to your server", iconURL: ctx.me.displayAvatarURL()})
            .setDescription(`**➡️ • Download FileZilla**\n> [Download link](https://download.filezilla-project.org/client/FileZilla_3.70.6_win64_sponsored2-setup.exe)\n> [Official website](https://filezilla-project.org/)\n> [Tutorial](https://www.youtube.com/watch?v=EpQw9V3jXrM)`+
            `\n\n**👤 • Login Information**\n> **Host:** [${ctx.config["pelican"]["host"]}](https://google.com)\n> **Port:** \`${ctx.config["pelican"]["port"]}\`\n> **Username: **Your server → Settings → SFTP Information → Username\n> **Password:** same as the password you use to access the panel`)
            .setColor(ctx.me.displayHexColor)
            .setFooter({text: `Requested by ${ctx.user.displayName}`, iconURL: ctx.user.displayAvatarURL() || ctx.me.displayAvatarURL()})

        ctx.send({embeds: [embed]});
    }
}

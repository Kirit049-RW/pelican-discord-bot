const { MessageFlags } = require('discord.js');

module.exports = class CommandContext {
    constructor (client, command, interaction) {
        this.client = client
        this.command = command
        this.inter = interaction
        this.options = interaction.options
    }

    get config () {
        return this.client.config;
    }

    get database () {
        return this.client.database;
    }

    get pelican () {
        return this.client.pelicanHandler;
    }

    get utils() {
        return this.client.functions;
    }

    get messageFormatter() {
        return this.client.messageFormatter;
    }

    get emojiSuccess () {
        return this.client.emojiSuccess;
    }

    get emojiError () {
        return this.client.emojiError;
    }

    get guild () {
        return this.inter.guild;
    }

    get me () {
        return this.guild.members.me;
    }

    get user () {
        return this.member.user;
    }

    get member () {
        return this.inter.member;
    }

    get channel () {
        return this.inter.channel;
    }

    getMember (memberId) {
        return this.guild.members.cache.get(memberId);
    }
    
    async send (content) {
        if (this.inter && !this.inter.replied) {
            if (typeof content === 'string') {
                content = {
                    content,
                    flags: MessageFlags.Ephemeral
                }
            }

            this.inter.reply(content)

            return this.inter.fetchReply()
                .then((data) => data)
                .catch(() => null)
        }

        return this.channel?.send(content)
    }

    success (content) {
        return this.send(this.messageFormatter.success(content));
    }

    error (content) {
        return this.send(this.messageFormatter.error(content));
    }
}

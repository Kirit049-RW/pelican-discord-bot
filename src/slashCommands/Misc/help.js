const SlashCommand = require('../../managers/structures/SlashCommands.js');
const { StringSelectMenuBuilder, ActionRowBuilder, ContainerBuilder, SeparatorSpacingSize, MessageFlags, ButtonBuilder } = require('discord.js');

module.exports = class Help extends SlashCommand {
    constructor(handler) {
        super(handler,{
            name: 'help',
            description: 'Display the list of available commands',
            description_localizations: {
                "fr": "Afficher la liste des commandes disponibles",
            },
            category: SlashCommand.Categories.Misc,
            bot_permissions: ['EmbedLinks']
        });
    }

    getSubCommands(cmd, languageUsed) {
        // It's creating an array to store all the commands.
        const allCommands = []

        // It's checking if the command has options, and if it doesn't, it's pushing the command to the array.
        if (cmd.options.filter((o) => o.type <= 2).length === 0) return [{
            name: cmd.name,
            description: cmd.description_localizations[languageUsed] ? cmd.description_localizations[languageUsed] : cmd.description
        }]

        // It's getting all the commands with their options.
        for (const opt of cmd.options) {
            if (opt.type === 1) allCommands.push({
                name: `${cmd.name} ${opt.name}`,
                description: opt.description_localizations[languageUsed] ? opt.description_localizations[languageUsed] : opt.description
            })
            else if (opt.type === 2) {
                for (const opt2 of opt.options) {
                    if (opt2.type === 1) allCommands.push({
                        name: `${cmd.name} ${opt.name} ${opt2.name}`,
                        description: opt2.description_localizations[languageUsed] ? opt2.description_localizations[languageUsed] : opt2.description
                    })
                }
            }
        }
        return allCommands
    }

    getCommandsCategory(slashCommandsData) {
        // It's getting all the command data
        const { commands, applicationCommands, languageUsed } = slashCommandsData

        // It's creating an array to store all the commands.
        const allCommands = []

        // It's filtering the commands to get only the commands that the user can use, and then it's mapping the commands to get the commands with their options.
        commands.map((cmd) => {
            allCommands.push(...this.getSubCommands(cmd, languageUsed))
        });

        //It's creating a field for each command.
        return allCommands
            .map((cmd) => {
                const commandName = cmd.name.split(' ')[0]
                const cmdFetch = applicationCommands.find((c) => c.name === commandName)
                return `${cmdFetch ? `</${cmd.name}:${cmdFetch?.id || 'null'}>` : `\`${cmd.name}\``} : ${cmd.description}`
            }).join('\n')
    }

    createComponents(ctx, categories, lang, container) {
        const buttonHome = new ButtonBuilder()
            .setStyle(3)
            .setEmoji('🏠')
            .setCustomId('help_home')

        const buttonClose = new ButtonBuilder()
            .setStyle(4)
            .setEmoji('📕')
            .setCustomId('help_close')

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_categories')
            .setPlaceholder("Choose a category")
            .setMinValues(1)
            .setMaxValues(1)

        for (let i = 0; i < categories.length; i++) {
            const category = categories[i];

            selectMenu.addOptions({
                label: `${category[1].name[lang]}`,
                emoji: `${category[1].emoji}`,
                value: `${category[1].id}`
            });
        }

        const row = new ActionRowBuilder()
            .addComponents(buttonHome, buttonClose);

        container
            .addActionRowComponents(r => r.addComponents(selectMenu))

        return row;
    }

    async run (ctx) {
        // Get the user language
        const languageUsed = ctx.inter.locale

        // Get slashCommands of the file bot
        let slashCommands = ctx.client.slashCommandsHandler.slashCommands;

        // Get the slashCommands in the rest api
        let applicationCommands = await ctx.guild.commands.fetch();

        // Keep only commands that the user can use by comparing the permissions of the user and the permissions of the command
        applicationCommands = applicationCommands
            .filter((cmd) => {
                if (cmd.defaultMemberPermissions === null) return true;
                return ctx.member.permissions.has(cmd.defaultMemberPermissions);
            });

        // Remove the commands in the files that user can't use
        slashCommands = ctx.client.slashCommandsHandler.slashCommands
            .filter((cmd) => applicationCommands.find((c) => c.name === cmd.name));

        // Get the categories
        let categories = Object.entries(SlashCommand.Categories)
            .filter(([_, value]) => ![1].includes(value.id));

        // Ignore categories without commands
        categories = categories.filter((x) => {
            const commands = slashCommands.filter((cmd) => cmd.category.id === x[1].id);
            return commands.size > 0;
        });

        // Get main commands
        const commandsMisc = slashCommands.filter(x => x.disableSlash === false && [1].includes(x.category.id));

        const slashCommandsDataMisc = {
            commands: commandsMisc,
            applicationCommands,
            languageUsed
        }

        const container = new ContainerBuilder()
            .setAccentColor(0x5865F2)
            .addSectionComponents(s => s
                .addTextDisplayComponents(t => t.setContent("### List of available commands"))
                .setThumbnailAccessory(t => t.setURL(ctx.me.displayAvatarURL()))
            )
            .addTextDisplayComponents(t => t.setId(1).setContent(`**⭐ __Misc__ :**\n${this.getCommandsCategory(slashCommandsDataMisc) || "No command"}`))
            .addSeparatorComponents(s => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small))

        const buttons = this.createComponents(ctx, categories, languageUsed, container);

        const msg = await ctx.send({
            components: [container, buttons],
            flags: MessageFlags.IsComponentsV2
        });

        const filter = (i) => i.user.id === ctx.user.id;
        const collectorButton = msg.createMessageComponentCollector({ filter, idle: 2 * 60 * 1000, componentType: 2 });
        const collectorMenu = msg.createMessageComponentCollector({ filter, idle: 2 * 60 * 1000, componentType: 3 });

        collectorButton.on('collect', async (button) => {
            await button.deferUpdate();

            if (button.customId === "help_home") {
                return button.message.edit({
                    components: [container, buttons],
                }).catch(() => null);
            }
            else if (button.customId === "help_close") {
                collectorButton.stop();
                collectorMenu.stop();

                return button.message.edit({
                    components: ctx.messageFormatter.disableButtons(button.message.components, true)
                }).catch(() => null);
            }
        });

        collectorMenu.on('collect', async (menu) => {
            await menu.deferUpdate();

            const categoryId = Number(menu.values[0]);
            const category = categories.find(([_, value]) => value.id === categoryId);
            if (!category) return

            const commands = slashCommands.filter(x => x.disableSlash === false && x.category.id === category[1].id)

            // Format the data
            const slashCommandsData = {
                commands,
                applicationCommands,
                languageUsed
            }

            const containerCommands = new ContainerBuilder()
                .setAccentColor(0x5865F2)
                .addSectionComponents(s => s
                    .addTextDisplayComponents(t => t.setContent("### List of available commands"))
                    .addTextDisplayComponents(t => t.setId(1).setContent(`${category[1].emoji} **__${category[1].name[languageUsed]}__**\n${this.getCommandsCategory(slashCommandsData) || "No command"}`))
                    .setThumbnailAccessory(t => t.setURL(ctx.me.displayAvatarURL()))
                )
                .addSeparatorComponents(s => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small))

            const buttonsCommands = this.createComponents(ctx, categories, languageUsed, containerCommands);

            return menu.message.edit({
                components: [containerCommands, buttonsCommands]
            }).catch(() => null);
        });

        collectorMenu.on('end', (_, reason) => {
            if (reason === "idle") return msg.edit({ components: ctx.messageFormatter.disableButtons(msg.components, true) }).catch(() => null);
        });
    }
}

const { ButtonBuilder,
    StringSelectMenuBuilder,
    UserSelectMenuBuilder,
    ChannelSelectMenuBuilder,
    RoleSelectMenuBuilder,
    MentionableSelectMenuBuilder
} = require('discord.js');

module.exports = class MessageFormatter {
    constructor (client) {
        this.client = client
        this.config = client.config
    }

     /**
     * Format message with custom emote
     * @param {string} message The message
     * @param {string || null} prefix
     * @return {*}
     */
    custom (message, prefix = null) {
        return (prefix ? `${prefix} ` : '') + message
    }

     /**
     * Format message with success
     * @param {string} message The message
     * @return {*}
     */
    success (message) {
        return this.custom(message, this.client.emojiSuccess)
    }

     /**
     * Format message with error
     * @param {string} message The message
     * @return {*}
     */
    error (message) {
        return this.custom(message, this.client.emojiError)
    }

     /**
     * Get components to display pages
     * @param {string} label The label for middle page
     * @param {Number} page The current page
     * @param {Number} pages The number of total pages
     * @param {Boolean} off Disable the buttons
     * @return {[{components: [{emoji: string, custom_id, style: number, disabled: boolean, type: number},{custom_id, style: number, disabled: boolean, label, type: number},{emoji: string, custom_id, style: number, disabled: boolean, type: number}], type: number}]}
     */
     pages = (label, page, pages, off = false) => {
         return [{
             type: 1,
             components: [new ButtonBuilder()
                 .setCustomId('left')
                 .setStyle(2)
                 .setEmoji('⬅️')
                 .setDisabled(page === 1 || off),
                 new ButtonBuilder()
                     .setCustomId('middle')
                     .setStyle(3)
                     .setLabel(label)
                     .setDisabled(true),
                 new ButtonBuilder()
                     .setCustomId('right')
                     .setStyle(2)
                     .setEmoji('➡️')
                     .setDisabled(page === pages || off)]
         }]
     }

    /**
     * Disable all components of a message
     * @param {Array} components The components
     * @param {Boolean} isV2 Whether it's components v2 or not
     * @return {Array}
     */
    disableButtons(components, isV2= false) {
        if (!isV2) {
            for (let x = 0; x < components.length; x++) {
                for (let y = 0; y < components[x].components.length; y++) {
                    components[x].components[y] = ButtonBuilder.from(components[x].components[y]);
                    if (components[x].components[y].data?.style !== 5) components[x].components[y].setDisabled(true);
                }
            }
        }
        else {
            for (let x = 0; x < components.length; x++) {
                for (let y = 0; y < components[x].components.length; y++) {
                    // 🔹 Cas 1 : ActionRow (type 1)
                    if (components[x].components[y].type === 1 && components[x].components[y].components) {
                        for (let z = 0; z < components[x].components[y].components.length; z++) {
                            if (components[x].components[y].components[z].data?.style) {
                                // Keep Link buttons enabled
                                if (components[x].components[y].components[z].data?.style !== 5) components[x].components[y].components[z] = ButtonBuilder.from(components[x].components[y].components[z]).setDisabled(true);
                            }
                            // Disable select menus
                            else if ([3, 5, 6, 7, 8].includes(components[x].components[y].components[z].type)) {
                                switch (components[x].components[y].components[z].data?.type) {
                                    case 3:
                                        components[x].components[y].components[z] = StringSelectMenuBuilder.from(components[x].components[y].components[z]).setDisabled(true);
                                        break;
                                    case 5:
                                        components[x].components[y].components[z] = UserSelectMenuBuilder.from(components[x].components[y].components[z]).setDisabled(true);
                                        break;
                                    case 6:
                                        components[x].components[y].components[z] = ChannelSelectMenuBuilder.from(components[x].components[y].components[z]).setDisabled(true);
                                        break;
                                    case 7:
                                        components[x].components[y].components[z] = RoleSelectMenuBuilder.from(components[x].components[y].components[z]).setDisabled(true);
                                        break;
                                    case 8:
                                        components[x].components[y].components[z] = MentionableSelectMenuBuilder.from(components[x].components[y].components[z]).setDisabled(true);
                                        break;
                                }
                            }
                        }
                    }

                    // 🔹 Cas 2 : SectionComponent (type 9) avec accessory
                    if (components[x].components[y].type === 9 && components[x].components[y].accessory) {
                        if (components[x].components[y].accessory.data?.style) {
                            if (components[x].components[y].accessory.data?.style !== 5) components[x].components[y].accessory = ButtonBuilder.from(components[x].components[y].accessory).setDisabled(true);
                        }
                    }

                    // 🔹 Cas 3 : Bouton direct
                    if (components[x].components[y].data?.style) {
                        if (components[x].components[y].data?.style !== 5) components[x].components[y] = ButtonBuilder.from(components[x].components[y]).setDisabled(true)
                    }
                }
            }
        }

        return components;
    }
}







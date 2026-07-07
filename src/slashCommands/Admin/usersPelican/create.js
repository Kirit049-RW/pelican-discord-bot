const SlashCommand = require('../../../managers/structures/SlashCommands.js');
const generator = require('generate-password');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const axios = require('axios');

module.exports = class UserCreate extends SlashCommand {
    constructor(handler) {
        super(handler,{
            name: 'user-create',
            description: 'Create a new user',
            description_localizations: {
                "fr": "Créer un nouvel utilisateur"
            },
            options: [{
                name: 'email',
                description: 'Email of the user to create',
                description_localizations: {
                    "fr": "Email de l'utilisateur à créer"
                },
                type: 3,
                required: true
            }, {
                name: 'username',
                description: 'Username of the user to create',
                description_localizations: {
                    "fr": "Pseudo de l'utilisateur à créer"
                },
                type: 3,
                required: true
            }, {
                name: 'discord',
                description: 'Discord user to link to the pelican user',
                description_localizations: {
                    "fr": "Utilisateur Discord à lier à l'utilisateur pelican"
                },
                type: 6,
                required: true
            }],
            category: SlashCommand.Categories.UserPelican,
            user_permissions: ['Administrator']
        });
    }

    async fetchImage(src) {
        const image = await axios
            .get(src, {
                responseType: 'arraybuffer'
            })
        return image.data;
    }

    async run (ctx) {
        const email = ctx.options.getString('email');
        const username = ctx.options.getString('username');
        const discord = ctx.options.getUser('discord');

        /* Check if user is valide because username must start and end with alpha-numeric characters and contain only letters, numbers, dashes, underscores, and periods. */
        if (!username.match(/^[a-zA-Z0-9][a-zA-Z0-9_-]+[a-zA-Z0-9]$/)) return ctx.error('The username must start and end with alpha-numeric characters and contain only letters, numbers, dashes, underscores, and periods!');

        /* Check if a user already exists with this email */
        try {
            const usersPelican = await ctx.pelican.requestApplication("users");

            const userPelican = usersPelican.find(u => u.attributes.email === email);
            if (userPelican) return ctx.error('A user with this email already exist!');
        } catch (err) {
            ctx.pelican.handlePelicanError(err, 'users');
            return ctx.error('An error occurred while trying to get the users from Pelican!');
        }

        /* Check if this discord user is a bot */
        if (discord.bot) return ctx.error('You can\'t link a bot to a pelican user!');

        /* Check if a user is already linked to this discord user */
        const userDiscord = await ctx.database.table('users').select().where('discordId', discord.id);
        if (userDiscord[0]) return ctx.error('This discord user is already linked to a pelican user!');

        /* Send a waiting message */
        await ctx.send({
            content: `:clock10: Creating the user pelican...`
        });

        /* Create the user */
        if (ctx.config["pelican"]["mailSetup"]) {
            try {
                const newUser = await ctx.pelican.requestApplication("users", "post", { username, email });

                await ctx.inter.editReply({
                    content: `${ctx.emojiSuccess} The user \`${username}\` has been created on Pelican!\n> An email has been sent to the user with a link to set their password.\n> *The email may take a few minutes to arrive, please check your spam folder if you don't see it.*`
                });

                /* Link the user to the discord user */
                await ctx.database.table('users').insert({ discordId: discord.id, userPelicanId: newUser.attributes.id });
            } catch (err) {
                ctx.pelican.handlePelicanError(err, 'users', 'post');

                ctx.inter.editReply({ content: `${ctx.emojiError} An error occurred while trying to create the user on Pelican!` });
            }
        }
        else {
            /* Generate a password */
            const password = generator.generate({ length: 8, numbers: true, lowercase: true, uppercase: true, strict: true });

            /* Check if folder pdf exist */
            ctx.utils.createFolderIfNotExists('./pdf')

            /* Create PDF */
            const doc = new PDFDocument({
                size: 'A6',
                layout: 'landscape',
                info: {
                    Title: 'Login information',
                    Author: 'Pelican Login',
                }
            });

            /* Check if file already exists */
            if (fs.existsSync(`./pdf/login_${discord.displayName}.pdf`)) {
                fs.unlinkSync(`./pdf/login_${discord.displayName}.pdf`);
            }

            /*Create stream */
            const stream = fs.createWriteStream(`./pdf/login_${discord.displayName}.pdf`);

            doc.pipe(stream)

            /* Title */
            doc.fontSize(20)
            doc.font('Helvetica-Bold')
            doc.text('Login information', {
                align: 'center',
                underline: true
            })

            /* Content */
            doc.moveDown(1)
            doc.fontSize(8)
            doc.font('Helvetica')
            doc.text('Link to the panel:          ', {
                align: 'center',
                continued: true
            })

            doc.fillColor('blue')
            doc.text(`click here`, {
                align: 'center',
                link: ctx.config["pelican"]["url"],
                underline: true
            })

            doc.fillColor('black')
            doc.text(`Email : ${email}\nUsername : ${username}\nPassword : ${password}`, {
                align: 'center'
            })

            doc.moveDown(1)
            doc.fillColor('red')
            doc.font('Helvetica-Bold')
            doc.text('IMPORTANT! Please change your password the first time you log in!', {
                underline: true,
                align: 'center'
            })

            /* Image */
            const logo = await this.fetchImage(ctx.me.user.displayAvatarURL({ extension: 'png' }));
            doc.moveDown(1)
            doc.image(logo, doc.page.width/2 - 50/2,doc.y, {
                width: 50
            })

            /* End */
            doc.end()

            stream.on('finish', async () => {
                /* Create the user */
                try {
                    const newUser = await ctx.pelican.requestApplication("users", "post", { username, email, password });

                    await ctx.inter.editReply({
                        content: `${ctx.emojiSuccess} The user \`${username}\` has been created on Pelican!`,
                        files: [{
                            attachment: `./pdf/login_${discord.displayName}.pdf`
                        }]
                    });

                    /* Link the user to the discord user */
                    await ctx.database.table('users').insert({
                        discordId: discord.id,
                        userPelicanId: newUser.attributes.id
                    });
                } catch (err) {
                    ctx.pelican.handlePelicanError(err, 'users', 'post');

                    ctx.inter.editReply({ content: `${ctx.emojiError} An error occurred while trying to create the user on Pelican!` });
                }
            });
        }
    }
}

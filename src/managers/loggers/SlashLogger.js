const moment = require("moment");

const BASE_COLOR = "\x1b[";
const RESET = BASE_COLOR + "0m";

module.exports = class SlashLogger {
    slashCommand = (inter) => {
        const args = [];
        for (let option of inter.options.data) {
            if (option.type === 1) {
                if (option.name) args.push({ name: option.name, values: [], type: option.type });
                option.options?.forEach((x) => {
                    if (x.value) args[args.length - 1].values.push({ name: x.name, value: x.value, type: option.type });
                });
            }
            else if (option.value) args.push({ name: option.name, value: option.value, type: option.type });
        }

        const timestamp = `[${moment().format("DD-MM-YYYY HH:mm:ss")}]:`;

        console.log(RESET + BASE_COLOR + "37m" + `--------------------------------\n${timestamp}
    ${BASE_COLOR + "1;31m"}User: ${BASE_COLOR + "0;31m"}${inter.user.displayName}
        ID : ${inter.user.id}
    ${BASE_COLOR + "1;32m"}Guild: ${BASE_COLOR + "0;32m"}${inter.guild.name}
        ID : ${inter.guild.id}
    ${BASE_COLOR + "1;33m"}Channel: ${BASE_COLOR + "0;33m"}${inter.channel.name}
        ID : ${inter.channel.id}
    ${BASE_COLOR + "1;34m"}Command: ${BASE_COLOR + "0;34m"}${inter.commandName}
        ${args.length > 0 ? args.map(x => `${x.type === 1 ? `${BASE_COLOR + "1;36m"}SubCommand: ${BASE_COLOR + "0;36m"}${x.name}
            ${BASE_COLOR + "1;35m"}Options: ${BASE_COLOR + "0;35m"}${x.values.map(v => `${v.name}=${v.value.startsWith("pacc_") ? "Hide" : v.value}`).join(', ')}` : `${BASE_COLOR + "1;35m"}Options: ${BASE_COLOR + "0;35m"}${x.name}: ${x.value.startsWith("pacc_") ? "Hide" : x.value}` }`).join(', ') : ''}
    ` + RESET);
    }
}
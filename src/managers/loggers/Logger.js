const chalk = require("chalk").default;
const moment = require("moment");

module.exports = class Logger {
    log = (content, type = "log") => {
        const timestamp = `[${moment().format("DD-MM-YYYY HH:mm:ss")}] :`;
        switch (type) {
            case "log": {
                return console.log(chalk.blue.bold(`${timestamp} ${chalk.white(type.toUpperCase())} ${content}`));
            }
            case "warn": {
                return console.log(`${timestamp} ${chalk.black.bgYellow(type.toUpperCase())} ${content}`);
            }
            case "error": {
                return console.log(chalk.red.bold(`${timestamp} ${chalk.white(type.toUpperCase())} ${content}`));
            }
            case "pelican": {
                return console.log(`${timestamp} ${chalk.black.bgBlue(type.toUpperCase())} ${content}`);
            }
            case "cmd": {
                return console.log(`${timestamp} ${chalk.black.bgWhite(type.toUpperCase())} ${content}`);
            }
            case "ready": {
                console.log(chalk.gray("—————————————————————————————————"));
                console.log(chalk.magenta.bold(`${timestamp} ${chalk.black.greenBright(type.toUpperCase())} ${content}`));
                return console.log(chalk.gray("—————————————————————————————————"));
            }
            default: throw new Error("Logger type must be either warn, debug, log, ready, cmd or error.");
        }
    };

    warn = (...args) => this.log(...args, "warn");

    error = (...args) => this.log(...args, "error");

    pelican = (...args) => this.log(...args, "pelican");

    cmd = (...args) => this.log(...args, "cmd");

    ready = (...args) => this.log(...args, "ready");
}
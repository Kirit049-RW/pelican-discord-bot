const { existsSync, mkdirSync } = require('fs');
const { sep } = require('path');

module.exports = class Functions {
    constructor(client) {
        this.client = client;
    }

     /**
     * Wait a specific time
     * @param {Number} ms - The time to wait
     * @returns {Promise} - The promise
     * */
    sleep (ms) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms)
        });
    }

     /**
     * Format number with space
     * @param {Number} x The number
     * @return {string}
     */
    numberWithSpaces(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    }

     /**
     * Return the first letter in uppercase & the rest in lowercase
     * @param {String} string - The string to capitalize
     * @returns {String} - The string capitalized
     * */
    capitalize (string) {
        return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
    }

     /**
     * Send a string with the same length
     * @param {String} str - The string to send
     * @param {Number} length - The length of the string
     * @param {String} symbol - The symbol to use
     * @returns {String} - The string with the same length
     **/
    createPipedString(str, length, symbol) {
        return symbol + str + " ".repeat(length - str.length - 2) + symbol;
    }

     /**
     * Get packets of the data
     * @param {Array} data - The data
     * @param {Number} packetNumber - The number data per packets
     * @returns {Array} - The packets
     * */
    getNumberPacket (data, packetNumber) {
        const list = data.slice();
        const data_list = [];
        let perdList = [];
        const numberPerPage = packetNumber;
        const packet = Math.floor(data.length / numberPerPage);

        for (let x = 0; x < packet; x++) {
            for (let i = 0; i < numberPerPage; i++) {
                perdList.push(list.shift());
            }
            data_list.push(perdList);
            perdList = [];
        }

        perdList = [];
        for (const row of list) {
            perdList.push(row);
        }

        data_list.push(perdList);

        for (let j = 0; j < data_list.length; j++) {
            if (data_list[j].length === 0) {
                data_list.splice(j, 1);
            }
        }
        return data_list;
    }

    /**
     * Create a folder if not exists
     * @param {String} path - The path of the folder
     * */
    createFolderIfNotExists (path) {
        if (path.endsWith(sep)) {
            path = path.substring(0, path.length - 1);
        }
        if (!existsSync(path)) {
            mkdirSync(path);
        }
    }

    /**
     * Format megabytes to a human-readable string
     * @param megabytes - The megabytes to format
     * @return {string}
     */
    formatMegabytes(megabytes) {
        const sizes = ['MB', 'GB', 'TB'];
        if (megabytes === 0) return '∞';
        const i = Math.floor(Math.log(megabytes) / Math.log(1024));

        if (i >= 2) {
            return `${(megabytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
        } else {
            return `${Math.round(megabytes / Math.pow(1024, i))} ${sizes[i]}`;
        }
    }

    /**
     * Format bytes to a human-readable string
     * @param bytes - The bytes to format
     * @return {string}
     */
    formatBytes(bytes) {
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
    }

    /**
     * Get the embed color based on the Wings status
     * @param status - The status of the Wings server
     * @return {number}
     */
    embedColorFromWingsStatus(status) {
        switch (status) {
            case "online": return 0x00FF00; // Green
            case "offline": return 0xFF0000; // Red
            case "starting": return 0xFFFF00; // Yellow
            case "stopping": return 0xFFA500; // Orange
            case "installing": return 0x0000FF; // Blue
            default: return 0x808080; // Grey
        }
    }

    /**
     * Get the embed color based on the server status
     * @param status - The status of the server
     * @return {string}
     */
    serverPowerEmojiOnly(status) {
        switch (status) {
            case "running": return "🟢"
            case "offline": return "🔴"
            case "starting": return "🟡"
            case "stopping": return "🟠"
            default: return "⚪"
        }
    }
}

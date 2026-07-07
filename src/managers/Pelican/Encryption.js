const crypto = require("crypto");

module.exports = class Encryption {
    constructor() {
        this.ENCRYPTION_KEY = "encryption-pelican-botmarket-key";
        this.IV_LENGTH = 16;
        this.KEY = crypto.createHash("sha256").update(String(this.ENCRYPTION_KEY)).digest();
    }

    /**
     * Encrypt a text using AES-256-CBC
     * @param text - The text to encrypt
     * @return {string}
     */
    encrypt(text) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv("aes-256-cbc", this.KEY, iv);

        const encrypted = Buffer.concat([
            cipher.update(text, "utf8"),
            cipher.final()
        ]);

        return `${iv.toString("base64")}:${encrypted.toString("base64")}`;
    }

    /**
     * Decrypt a text using AES-256-CBC
     * @param text - The text to decrypt
     * @return {string}
     */
    decrypt(text) {
        const [iv64, encrypted64] = text.split(":");

        const iv = Buffer.from(iv64, "base64");
        const encrypted = Buffer.from(encrypted64, "base64");

        const decipher = crypto.createDecipheriv("aes-256-cbc", this.KEY, iv);

        return Buffer.concat([
            decipher.update(encrypted),
            decipher.final()
        ]).toString("utf8");
    }
}
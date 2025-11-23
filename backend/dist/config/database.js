"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncDatabase = exports.testConnection = exports.sequelize = void 0;
const sequelize_1 = require("sequelize");
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = __importDefault(require("./logger"));
dotenv_1.default.config();
exports.sequelize = new sequelize_1.Sequelize({
    dialect: 'mysql',
    host: process.env['DB_HOST'] || 'localhost',
    port: parseInt(process.env['DB_PORT'] || '3306'),
    username: process.env['DB_USER'] || 'pdflab',
    password: process.env['DB_PASSWORD'] || '',
    database: process.env['DB_NAME'] || 'pdflab',
    logging: process.env['NODE_ENV'] === 'development' ? (msg) => logger_1.default.debug(msg) : false,
    pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    define: {
        timestamps: true,
        underscored: true,
        freezeTableName: true
    }
});
const testConnection = async () => {
    try {
        await exports.sequelize.authenticate();
        logger_1.default.info('Database connection established successfully', {
            host: process.env['DB_HOST'],
            database: process.env['DB_NAME']
        });
        return true;
    }
    catch (error) {
        logger_1.default.error('Unable to connect to database', {
            error: error instanceof Error ? error.message : String(error),
            host: process.env['DB_HOST'],
            database: process.env['DB_NAME']
        });
        return false;
    }
};
exports.testConnection = testConnection;
const syncDatabase = async (force = false) => {
    try {
        // Skip alter to avoid "too many keys" error - use migrations instead
        await exports.sequelize.sync({ force, alter: false });
        logger_1.default.info('Database synchronized successfully', { force });
    }
    catch (error) {
        logger_1.default.error('Database sync failed', {
            error: error instanceof Error ? error.message : String(error),
            force
        });
        throw error;
    }
};
exports.syncDatabase = syncDatabase;
//# sourceMappingURL=database.js.map
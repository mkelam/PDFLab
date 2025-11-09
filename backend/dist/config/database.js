"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncDatabase = exports.testConnection = exports.sequelize = void 0;
const sequelize_1 = require("sequelize");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.sequelize = new sequelize_1.Sequelize({
    dialect: 'mysql',
    host: process.env['DB_HOST'] || 'localhost',
    port: parseInt(process.env['DB_PORT'] || '3306'),
    username: process.env['DB_USER'] || 'pdflab',
    password: process.env['DB_PASSWORD'] || '',
    database: process.env['DB_NAME'] || 'pdflab',
    logging: process.env['NODE_ENV'] === 'development' ? console.log : false,
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
        console.log('✓ Database connection established successfully');
        return true;
    }
    catch (error) {
        console.error('✗ Unable to connect to database:', error);
        return false;
    }
};
exports.testConnection = testConnection;
const syncDatabase = async (force = false) => {
    try {
        await exports.sequelize.sync({ force, alter: !force });
        console.log('✓ Database synchronized successfully');
    }
    catch (error) {
        console.error('✗ Database sync failed:', error);
        throw error;
    }
};
exports.syncDatabase = syncDatabase;
//# sourceMappingURL=database.js.map
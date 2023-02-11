const Sequelize = require('sequelize');
const sequelize = new Sequelize('database', 'username', 'password', {
	host: 'localhost',
	dialect: 'sqlite',
	logging: false,
	storage: 'database.sqlite',
});
sequelize.authenticate()
.then(()=>{
    console.log("Database connected");
})
.catch(err=>{
    console.log("ok",err);
});

const db = {};
db.sequelize = sequelize;

const scores = db.sequelize.define('scores', {
	uid: {
		type: Sequelize.STRING,
		unique: true,
	},
	score: Sequelize.INTEGER,
	match: Sequelize.INTEGER,
});

db.sequelize.sync()
.then(()=>{
	console.log("sync complete");
})
.catch(err=>{
	console.log("ok",err);
});
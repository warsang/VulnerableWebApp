module.exports = {

    //secret for user auth crypting
    'secret': 'ilovepredatortcts',

    //Mail stuff for nodemailer
    'service': 'Gmail', //smtp server service
    'Mailuser': 'something@gmail.com', //email account
    'Mailpass': 'somepassword',//password for Mailuser
    'to' : 'somemail@sumthing.com', // list of receivers

    //mail status in DB
    'notAnswered' : 0,
    'answered' : 1,

    //otherMailModule for pass retrieval (emailJS)
    'host'		: 'smtp.gmail.com',
    'sender'		: 'predator help-support <predator.umons@gmail.com>',
    'ssl' : true, //for ssl security

    //MongoDBstuff
    'database': 'mongodb://localhost/saliencyapp3', //not very usefull except if using mongoose
    'dbPort' : '27017',
    'dbHost' : 'localhost',
    'dbName' : 'saliencyapp3',

    //NR
    'days_nr' : 30,

    //Types of clients
    'client' :0,
    'prospect' : 1,

    //Types of users
    'regularUserType' : 0,
    'adminUserType' : 1,

    //app stuff
    'appHost' : 'localhost',
    'appId' : '240396',
    'appPort' : '3002',

    //sweetcaptchaconf

    'appKey' : '',//use your own
    'appSecret' : ''//use your own


};

const { User } = require("./db");

async function authorizationMiddleWare(req, res, next) {
    const { appointee, provider, startTime, endTime, appointeeTz } = req.body;
    const userAppointee = await User.findOne({email: appointee});
    if (!userAppointee)
        return res.status(400).json({msg: "Appointee not registered"});
    const providerAppointee = await User.findOne({email: provider});
    if (!providerAppointee)
        return res.status(400).json({msg: "User has not provided authorization for appointment booking"});
        
    next();
}

module.exports = {
    authorizationMiddleWare
}
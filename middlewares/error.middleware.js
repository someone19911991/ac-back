module.exports = (err, req, res, next) => {
    if(err){
        return res.status(err.status || 500).json(err);
    }
    next();
}
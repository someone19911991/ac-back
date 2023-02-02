const fs = require("fs");
const odf = require("pdf-creator-node");
const path = require("path");

const homeView = (req, res, next) => {
    res.render("home");
};

const generatePdf = async (req, res, next) => {
    const html = fs.readFileSync(
        path.resolve(__dirname, "../views/template.html"),
        "utf-8"
    );
    const fileName = Math.random() + "_doc" + ".pdf";
};

module.exports = { homeView };

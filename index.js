const express = require("express");
const cors = require("cors");
const router = require("./routes/index");
const fileUpload = require("express-fileupload");
const errorMiddleware = require("./middlewares/error.middleware");
const cron = require("node-cron");
const path = require("path");
const fs = require("fs");

const app = express();

const PORT = 5000;
const origin = ["http://localhost:3000", "https://auto-complex.netlify.app"];

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.use(cors({ origin }));
app.use(express.json({ extended: true }));
app.use(fileUpload({}));
app.get("/pdf/:id", (req, res) => {
    const {id} = req.params;
    res.render("home", {id});
});
app.use("/api", router);
app.use(errorMiddleware);

function deletePdfsEveryHour(){
    console.log('Here you go');
    const fullPath = path.join(__dirname, "public/pdf");
    const files = fs.readdirSync(fullPath);

    try {
        files.forEach((file) => {
            fs.unlinkSync(path.join(__dirname, "public/pdf", file));
        });
    } catch (error) {
        console.log(error);
    }
}

cron.schedule('0 */60 * * * *', function(){
    const date = new Date();
    const hours = date.getHours();
    deletePdfsEveryHour();
});

app.listen(PORT, () => console.log(`App running on port ${PORT}`));

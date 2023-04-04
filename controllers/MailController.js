const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");
const CC = require("currency-converter-lt");
const pool = require('../db');

class MailController {
    async trial(req, res, next) {
        try {
            const fromUSD = "USD";
            const fromEUR = "EUR";
            const toAMD = "AMD";
            const amount = 1;
            const usdConvert = new CC({ from: fromUSD, to: toAMD, amount });
            const eurConvert = new CC({ from: fromEUR, to: toAMD, amount });
            const convertedUSD = await usdConvert.convert();
            const convertedEUR = await eurConvert.convert();


            return res.json({convertedUSD, convertedEUR});
        } catch (err) {
            return res.status(500).json(err);
        }
    }

    async sendMail(req, res, next) {
        try {
            let fileName;
            if (req.files?.file) {
                const { file } = req.files;
                fileName = file.name;
                await file.mv(
                    path.resolve(__dirname, "..", "attachments", fileName)
                );
            }
            const transporter = nodemailer.createTransport({
                host: "smtp.gmail.com",
                port: "587",
                secure: false,
                auth: {
                    user: "autocomplex83@gmail.com",
                    pass: "mhtpcpzjdhslxuoc",
                },
            });
            const mailData = {
                from: "autocomplex83@gmail.com",
                to: "autocomplex83@gmail.com",
                subject: "Զանգի պատվեր",
                text: "",
                html: `<h1 style="text-align: center">Զանգի պատվեր</h1>
                            <div>
                                <p>${
                                    req.body?.fullName
                                        ? `<span style="font-weight: bold">Անուն: ${req.body?.fullName}</span>`
                                        : ""
                                }</p>
                                <p>${
                                    req.body?.phone
                                        ? `<span style="font-weight: bold">Հեռախոս: ${req.body?.phone}</span>`
                                        : ""
                                }</p>
                                <p>${
                                    req.body?.budget
                                        ? `<span style="font-weight: bold">Բյուջե: ${req.body?.budget}</span>`
                                        : ""
                                }</p>
                                <p>${
                                    req.body?.min
                                        ? `<span style="font-weight: bold">Նվազագույնը: ${req.body?.min}</span>`
                                        : ""
                                }</p>
                                <p>${
                                    req.body?.max
                                        ? `<span style="font-weight: bold">Առավելագույնը: ${req.body?.max}</span>`
                                        : ""
                                }</p>
                                <p>${
                                    req.body?.model
                                        ? `<span style="font-weight: bold">Ավտոմեքենայի մոդել: ${req.body?.model}</span>`
                                        : ""
                                }</p>
                                <p>${
                                    req.body?.notes
                                        ? `<span style="font-weight: bold">Նշումներ: ${req.body?.notes}</span>`
                                        : ""
                                }</p>
                            </div>`,
            };
            if (req.files?.file) {
                mailData.attachments = [
                    {
                        filename: "file.pdf",
                        path: path.resolve(
                            __dirname,
                            "..",
                            "attachments",
                            fileName
                        ),
                        contentType: "application/pdf",
                    },
                ];
            }
            const result = await transporter.sendMail(mailData);
            req.files?.file &&
                fs.unlinkSync(
                    path.resolve(__dirname, "..", "attachments", fileName)
                );
            return res.json(result);
        } catch (err) {
            next(err);
        }
    }
}

module.exports = new MailController();

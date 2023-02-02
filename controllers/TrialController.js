const pool = require("../db");
const axios = require("axios");
const pdf = require("html-pdf");
const { validationResult } = require("express-validator");
const data = require("../data");
const path = require("path");
const puppeteer = require('puppeteer');

class CalculationController {
    async calculate(req, res, next) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                let textMsg = "";
                errors.array().forEach((item) => (textMsg += `${item.msg}, `));
                textMsg = textMsg.slice(0, -2);
                return res.status(400).json(textMsg);
            }
            let {
                checkbox,
                auto_type,
                engine_volume,
                motor,
                auction_location,
                auction_location_id,
                price,
                auction,
                auction_fee = null,
                year,
            } = req.body;

            let currency = await axios.get(
                "https://online.evocabank.am/InternetBank/api/exchangerates/2"
            );
            currency = currency.data;

            let auction_location_price =
                motor == 3 || motor == 4
                    ? auction_location + 150
                    : auction_location;

            let auction_price = 0;

            if (auction == "iaai") {
                const query = `SELECT * FROM internet_bid_fee_iaai WHERE internet_bid_fee_iaai.from <= ${price} AND internet_bid_fee_iaai.to >= ${price}`;
                let auction_price_1 = await pool.query(query);

                auction_price_1 = auction_price_1[0][0].auction_price;

                let auction_price_2;
                if (price < 15000) {
                    const request = `SELECT * FROM buyer_fee_iaai WHERE buyer_fee_iaai.from <= ${price} AND buyer_fee_iaai.to >= ${price}`;
                    auction_price_2 = await pool.query(request);
                    auction_price_2 = auction_price_2?.[0]?.[0]?.auction_price;
                } else {
                    auction_price_2 = price * 0.06;
                }

                auction_price = auction_price_1 + auction_price_2 + 124;
            } else if (auction == "copart") {
                let copart_price_1 = await pool.query(
                    `SELECT * FROM internet_bid_fee WHERE internet_bid_fee.from <= ${price} AND internet_bid_fee.to >= ${price}`
                );
                copart_price_1 = copart_price_1[0]
                    ? copart_price_1[0][0].auction_price
                    : 0;

                let copart_price_2;

                if (price < 15000) {
                    copart_price_2 = await pool.query(
                        `SELECT * FROM buyer_fee WHERE buyer_fee.from <= ${price} AND buyer_fee.to >= ${price}`
                    );
                    copart_price_2 = copart_price_2[0]
                        ? copart_price_2[0][0].auction_price
                        : 0;
                } else {
                    copart_price_2 = price * 0.0575;
                }

                auction_price = copart_price_1 + copart_price_2 + 89;
            } else if (auction == "etc") {
                auction_price = auction_fee;
            }

            const insurance_price = Math.round(
                (price + auction_price + auction_location_price) * 0.01
            );
            let total;
            if (auto_type == "motorcycle") {
                total = price + auction_price;
            } else {
                total =
                    price +
                    auction_price +
                    auction_location_price +
                    insurance_price;
            }
            let dram;
            dram = currency[1]["CBRate"] / currency[0]["Sale"];

            let customs_clearance = 0;
            let vat = 0;
            let total_price1 = 0;
            let total_price2 = 0;
            let environmental = 0;
            let param;

            if (motor == 4) {
                checkbox = 0;
                param = await pool.query(
                    `SELECT * FROM param WHERE param.motor_id = ${motor} AND param.ice_power = 0`
                );
                param = param[0][0];
            } else if (checkbox == 1 && year == 1 && auto_type == "suv") {
                param = await pool.query(
                    `SELECT * FROM param WHERE 
                            param.year_id = ${year} AND 
                            param.vehicle_type = "${auto_type}" AND
                            param.motor_from <= ${engine_volume} AND
                            param.motor_to >= ${engine_volume} AND
                            param.ice_power >= 3`
                );
                param = param[0][0];
            } else {
                checkbox = 0;
                const request = `SELECT * FROM param WHERE
                    param.year_id = ${year} AND 
                    param.vehicle_type = ${
                    auto_type === "suv" ? "'sedan'" : `"${auto_type}"`
                } 
                      AND
                    param.motor_id = ${motor == 3 ? 1 : motor} AND
                    param.motor_from <= ${engine_volume} AND
                    param.motor_to >= ${engine_volume} AND
                    param.ice_power = ${motor == 5 ? 1 : 0}`;

                param = await pool.query(request);
                param = param[0][0];
            }

            let stavka;
            if (motor == 4) {
                stavka = param.stavka * dram;
            } else {
                stavka = param.stavka * dram * engine_volume;
            }

            let percent = (total * param.percent) / 100;
            if (motor == 4) {
                vat = 0;
                customs_clearance = 0; //($total) * 0.15;
            } else if (motor == 3 && year == 1 && engine_volume >= 2800) {
                customs_clearance = Math.round(total * 0.15);
                vat = Math.round((customs_clearance + total) * 0.2);
            } else {
                customs_clearance = Math.round(
                    stavka >= percent ? stavka : percent
                );
                vat = Math.round((customs_clearance + total) * 0.2);
            }

            if (year == 3 || year == 4) {
                environmental = Math.round(total * 0.02);
            } else if (year == 7) {
                environmental = Math.round(total * 0.1);
            } else if (year == 6) {
                environmental = Math.round(total * 0.02);
            }

            let servicePrice;
            if (price > 20000) {
                servicePrice = (price * 1.5) / 100;
            } else {
                servicePrice = 300;
            }

            if (auto_type == "motorcycle") {
                Math.round(
                    (total_price2 =
                        price +
                        auction_price +
                        auction_location_price +
                        vat +
                        customs_clearance +
                        insurance_price +
                        environmental +
                        75 +
                        servicePrice)
                );
                total_price1 = Math.round(total_price2 * currency[0]["Sale"]);
            } else {
                total_price2 = Math.round(
                    total +
                    vat +
                    customs_clearance +
                    environmental +
                    75 +
                    servicePrice
                );
                total_price1 = Math.round(total_price2 * currency[0]["Sale"]);
            }

            let motorM = await pool.query(
                `SELECT * FROM motor WHERE motor.id = ${motor}`
            );
            motorM = motorM[0][0];
            let year_text = await pool.query(
                `SELECT * FROM year WHERE id = ${year}`
            );
            year_text = year_text?.[0]?.[0]?.name;
            const response = {
                price,
                servicePrice,
                auction_location_price,
                auction_location_id,
                copart_price: auction_price,
                year,
                year_text: year_text || "",
                motor,
                auto_type,
                engine_volume,
                total,
                insurance_price,
                auction,
                customs_clearance,
                vat,
                environmental,
                total_price1,
                total_price2,
                checkbox,
            };

            return res.json(response);
        } catch (err) {
            console.log(err);
            next(err);
        }
    }

    async createAndDownloadPdf(req, res, next){
        try{
            const {
                lang,
                auction,
                copart_price,
                auction_location_place,
                auction_location_price,
                customs_clearance,
                engine_volume,
                environmental,
                insurance_price,
                motor_type,
                price,
                servicePrice,
                total_price1,
                total_price2,
                transport_type,
                vat,
                year,
            } = req.body;
            const auctionImg = auction === 'copart' ? 'https://autocomplex.am/static/media/coopart.2e5e27269181df279ff9.png' : auction === 'iaai' ? 'https://autocomplex.am/static/media/iaai.18e2f9b8d3a79923a8a7.svg' : '';
            const browser = await puppeteer.launch({headless: false});
            const page = await browser.newPage();
            const content = `<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport"
              content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
        <title>Document</title>
        <style>
            * {
                margin: 0;
                font-family: Arial, sans-serif;
                box-sizing: border-box;
            }
            .container{
                max-width: 800px;
                margin: 10px auto;
            }
            header{
                margin-bottom: 20px;
            }
            .content{
                background-color: #E6E7E8;
            }
            .address-item{
                width: 200px;
                float: left;
                font-size: 14px;
                font-weight: bold;
                margin-top: 52px;
            }
            .address-item p{
                text-align: center;
            }
            .clear{
                clear: both;
            }
            .img-container{
                margin: 0;
            }
            .img-container img{
                width: 200px;
            }
            .row{
                margin-bottom: 4px;
            }
            .col{
                border: 1px solid black;
                float: left;
            }
            .col{
                padding: 3px;
            }
            .col1{
                border-left: none;
                width: 396px;
                margin-right: 3px;
            }
            .col1{
                padding-left: 10px;
            }
            .col2{
                border-right: none;
                text-align: center;
                width: 399px;
            }
            .col2 img{
                height: 50px;
            }
            .content{
                margin-top: 20px;
            }
            .col1.colored{
                padding-left: 0;
            } 
            .border_red{
              background-color: #eb1921;
            }
            .border_yellow{
              background-color: #FFDB2D; 
            }
            .border_orange{
              background-color: #F8991D; 
            }
            .col1.colored{
                padding-left: 0;
                position: relative;
            }
            .col1-text{
                margin-left: 10px;
            }
            .border_red, .border_orange, .border_yellow{
                position: absolute;
                top: 0;
                bottom: 0;
                left: 0;
                width: 6px;
            }
            .info{
                margin-bottom: 20px;
                background-color: #E6E7E8;
            }
            .info span{
                display: inline-block;
                width: 268px;
                border: 1px solid;
                padding: 5px;
                font-weight: bold;
                font-size: 17px
            }
            .info span:first-child{
                border-left: 0;
                width: 255px;
            }
            .info span:last-child{
                border-right: 0;
                /*width: 266px;*/
            }
            .info_3{
                background-color: #E6E7E8;
            }
            .info_3 div:not(.clear) {
                display: inline-block;
                width: 266px;
                height: 85px;
                font-size: 14px;
                font-weight: bold;
                border: 1px solid;
                float: left;
                padding: 5px;
            }
        </style>
    </head>
    <body style="box-sizing: border-box">
        <div class="container">
            <header>
                
                <div class="img-container address-item">
                    <img
                        src="https://autocomplex.am/static/media/autocomplex.7e49d8d95bfae05bfc04.png"
                        alt=""
                    />
                </div>
                <div class="address-item address">
                    <p>${data[lang].address1}</p>
                    <p>autocomplex1@mail.ru</p>
                    <p>+374 33 538080</p>
                </div>
                <div class="address-item address">
                    <p>${data[lang].address2}</p>
                    <p>autocomplex1@mail.ru</p>
                    <p>+374 55 666555</p>
                </div>
                <div class="address-item address">
                    <p>${data[lang].address3}</p>
                    <p>autocomplex1@mail.ru</p>
                    <p>+374 95 505054</p>
                </div>
                <div class="clear"></div>
            </header>
            <div class="content">
                <div class="row">
                    <p class="col col1" style="padding-top: 21px; padding-bottom: 21px">${
                data[lang].auction
            }</p>
                    <div class="col col2" style="padding: ${
                auction === "copart" ? "11px 0" : "3.5px 0"
            }">
                        <img style="height: ${
                auction === "copart" ? "35px" : "50px"
            };" src="${auctionImg}" alt="">
                    </div>
                    <div class="clear"></div>
                </div>
                <div class="row">
                    <p class="col col1">${data[lang].selected_location}</p>
                    <p class="col col2">${auction_location_place}</p>
                    <div class="clear"></div>
                </div>
                <div class="row">
                    <p class="col col1">${data[lang].age}</p>
                    <p class="col col2">${data[lang].year[year]}</p>
                    <div class="clear"></div>
                </div>
                <div class="row">
                    <p class="col col1">${data[lang].fuel_type}</p>
                    <p class="col col2">${data[lang].motor_type[motor_type]}</p>
                    <div class="clear"></div>
                </div>
                <div class="row">
                    <p class="col col1">${data[lang].engine}</p>
                    <p class="col col2">${engine_volume}</p>
                    <div class="clear"></div>
                </div>
                <div class="row">
                    <p class="col col1">${data[lang].vehicle_type}</p>
                    <p class="col col2">${
                data[lang].vehicle_types[transport_type]
            }</p>
                    <div class="clear"></div>
                </div>
            </div>
            <div class="content">
                <div class="row">
                    <p class="col col1 colored">
                        <span class="border_red"></span>
                        <span class="col1-text">${data[lang].car_price}</span>
                    </p>
                    <p class="col col2">${price?.toLocaleString()}</p>
                    <div class="clear"></div>
                </div>
                <div class="row">
                    <p class="col col1 colored">
                        <span class="border_red"></span>
                        <span class="col1-text">${data[lang].auction_fee}</span>
                    </p>
                    <p class="col col2">${copart_price?.toLocaleString()}</p>
                    <div class="clear"></div>
                </div>
                <div class="row">
                    <p class="col col1 colored">
                    <span class="border_orange"></span>
                    <span class="col1-text">${data[lang].shipping_fee}</span>
                    </p>
                    <p class="col col2">${auction_location_price?.toLocaleString()}</p>
                    <div class="clear"></div>
                </div>
                <div class="row">
                    <p class="col col1 colored">
                        <span class="border_orange"></span>
                        <span class="col1-text">${data[lang].insurance}</span>
                    </p>
                    <p class="col col2">${insurance_price?.toLocaleString()}</p>
                    <div class="clear"></div>
                </div>
                <div class="row">
                    <p class="col col1 colored">
                        <span class="border_orange"></span>
                        <span class="col1-text">${
                data[lang].service_fee
            }</span></p>
                    <p class="col col2">${servicePrice?.toLocaleString()}</p>
                    <div class="clear"></div>
                </div>
                <div class="row">
                    <p class="col col1 colored">
                        <span class="border_yellow"></span>
                        <span class="col1-text">${
                data[lang].customs_duty
            }</span></p>
                    <p class="col col2">${customs_clearance?.toLocaleString()}</p>
                    <div class="clear"></div>
                </div>
                <div class="row">
                    <p class="col col1 colored">
                        <span class="border_yellow"></span>
                        <span class="col1-text">${data[lang].vat}</span>
                        </p>
                    <p class="col col2">${vat?.toLocaleString()}</p>
                    <div class="clear"></div>
                </div>
                <div class="row">
                    <p class="col col1 colored">
                        <span class="border_yellow"></span>
                        <span class="col1-text">${data[lang].eco_tax}</span>
                    </p>
                    <p class="col col2">${environmental?.toLocaleString()}</p>
                    <div class="clear"></div>
                </div>
                <div class="row">
                    <p class="col col1 colored">
                        <span class="border_yellow"></span>
                        <span class="col1-text">${data[lang].broker_fee}</span>
                    </p>
                    <p class="col col2">75</p>
                    <div class="clear"></div>
                </div>
            </div>
            <div class="info">
                <span>${data[lang].total}</span>
                <span>${total_price1?.toLocaleString()} Դ</span>
                <span>${total_price2?.toLocaleString()} $</span>
            </div>
            <div class="info_3">
                <div style="border-left: 5px solid #eb1921">${
                data[lang].col_1
            }</div>
                <div style="border-left: 5px solid #F8991D">${
                data[lang].col_2
            }</div>
                <div style="border-left: 5px solid #FFDB2D">${
                data[lang].col_3
            }</div>
            </div>
        </div>
    </body>
</html>`;

            await page.setContent(content);
            await page.emulateMediaType('screen');
            await page.pdf({path: path.resolve(__dirname, "../attachments", "calculation3.pdf"), width: 900, height: 900, printBackground: true});

            await browser.close();
            return res.json('Created');
        }catch(err){
            next(err)
        }
    }

    async fetchPdf(req, res, next){
        try{
            return res.sendFile(path.resolve(__dirname, "../attachments", 'calculation3.pdf'));
        }catch(err){
            next(err);
        }
    }

    async createPdf1(req, res, next) {
        try {
            const {
                lang,
                auction,
                copart_price,
                auction_location_place,
                auction_location_price,
                customs_clearance,
                engine_volume,
                environmental,
                insurance_price,
                motor_type,
                price,
                servicePrice,
                total_price1,
                total_price2,
                transport_type,
                vat,
                year,
            } = req.body;

            const auctionImg =
                auction === "copart"
                    ? "https://autocomplex.am/static/media/coopart.2e5e27269181df279ff9.png"
                    : auction === "iaai"
                        ? "https://autocomplex.am/static/media/iaai.18e2f9b8d3a79923a8a7.svg"
                        : null;
            const template2 = `<!DOCTYPE html>
<html lang="${lang}">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport"
              content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
        <title>Calculation</title>
        <style>
            * {
                margin: 0;
                font-family: Arial, sans-serif;
                box-sizing: border-box;
            }
            .container{
                max-width: 800px;
                margin: 10px auto;
            }
            header{
                margin-bottom: 20px;
            }
            .content{
                background-color: #E6E7E8;
            }
            .address-item{
                width: 200px;
                float: left;
                font-size: 14px;
                font-weight: bold;
                margin-top: 52px;
            }
            .address-item p{
                text-align: center;
            }
            .clear{
                clear: both;
            }
            .img-container{
                margin: 0;
            }
            .img-container img{
                width: 200px;
            }
            .row{
                margin-bottom: 4px;
            }
            .col{
                border: 1px solid black;
                float: left;
            }
            .col{
                padding: 3px;
            }
            .col1{
                border-left: none;
                width: 396px;
                margin-right: 3px;
            }
            .col1{
                padding-left: 10px;
            }
            .col2{
                border-right: none;
                text-align: center;
                width: 399px;
            }
            .col2 img{
                height: 50px;
            }
            .content{
                margin-top: 20px;
            }
            .col1.colored{
                padding-left: 0;
            } 
            .border_red{
              background-color: #eb1921;
            }
            .border_yellow{
              background-color: #FFDB2D; 
            }
            .border_orange{
              background-color: #F8991D; 
            }
            .col1.colored{
                padding-left: 0;
                position: relative;
            }
            .col1-text{
                margin-left: 10px;
            }
            .border_red, .border_orange, .border_yellow{
                position: absolute;
                top: 0;
                bottom: 0;
                left: 0;
                width: 6px;
            }
            .info{
                margin-bottom: 20px;
                background-color: #E6E7E8;
            }
            .info span{
                display: inline-block;
                width: 263px;
                border: 1px solid;
                padding: 5px;
                font-weight: bold;
                font-size: 17px
            }
            .info span:first-child{
                border-left: 0;
            }
            .info span:last-child{
                border-right: 0;
                width: 266px;
            }
            .info_3{
                background-color: #E6E7E8;
            }
            .info_3 div:not(.clear) {
                display: inline-block;
                width: 266px;
                height: 85px;
                font-size: 14px;
                font-weight: bold;
                border: 1px solid;
                float: left;
                padding: 5px;
            }
        </style>
    </head>
    <body style="box-sizing: border-box">
        <div class="container">
            <div class="content">
                <div class="row">
                    <p class="col col1">${data[lang].auction}</p>
                    <p class="col col2">${auction}</p>
                    <div class="clear"></div>
                </div>
                <div class="row">
                    <p class="col col1">${data[lang].selected_location}</p>
                    <p class="col col2">${auction_location_place}</p>
                    <div class="clear"></div>
                </div>
                <div class="row">
                    <p class="col col1">${data[lang].age}</p>
                    <p class="col col2">${data[lang].year[year]}</p>
                    <div class="clear"></div>
                </div>
                <div class="row">
                    <p class="col col1">${data[lang].fuel_type}</p>
                    <p class="col col2">${data[lang].motor_type[motor_type]}</p>
                    <div class="clear"></div>
                </div>
                <div class="row">
                    <p class="col col1">${data[lang].engine}</p>
                    <p class="col col2">${engine_volume}</p>
                    <div class="clear"></div>
                </div>
                <div class="row">
                    <p class="col col1">${data[lang].vehicle_type}</p>
                    <p class="col col2">${
                data[lang].vehicle_types[transport_type]
            }</p>
                    <div class="clear"></div>
                </div>
            </div>
            <div class="content">
                <div class="row">
                    <p class="col col1 colored">
                        <span class="border_red"></span>
                        <span class="col1-text">${data[lang].car_price}</span>
                    </p>
                    <p class="col col2">${price?.toLocaleString()}</p>
                    <div class="clear"></div>
                </div>
                <div class="row">
                    <p class="col col1 colored">
                        <span class="border_red"></span>
                        <span class="col1-text">${data[lang].auction_fee}</span>
                    </p>
                    <p class="col col2">${copart_price?.toLocaleString()}</p>
                    <div class="clear"></div>
                </div>
                <div class="row">
                    <p class="col col1 colored">
                    <span class="border_orange"></span>
                    <span class="col1-text">${data[lang].shipping_fee}</span>
                    </p>
                    <p class="col col2">${auction_location_price?.toLocaleString()}</p>
                    <div class="clear"></div>
                </div>
                <div class="row">
                    <p class="col col1 colored">
                        <span class="border_orange"></span>
                        <span class="col1-text">${data[lang].insurance}</span>
                    </p>
                    <p class="col col2">${insurance_price?.toLocaleString()}</p>
                    <div class="clear"></div>
                </div>
                <div class="row">
                    <p class="col col1 colored">
                        <span class="border_orange"></span>
                        <span class="col1-text">${
                data[lang].service_fee
            }</span></p>
                    <p class="col col2">${servicePrice?.toLocaleString()}</p>
                    <div class="clear"></div>
                </div>
                <div class="row">
                    <p class="col col1 colored">
                        <span class="border_yellow"></span>
                        <span class="col1-text">${
                data[lang].customs_duty
            }</span></p>
                    <p class="col col2">${customs_clearance?.toLocaleString()}</p>
                    <div class="clear"></div>
                </div>
                <div class="row">
                    <p class="col col1 colored">
                        <span class="border_yellow"></span>
                        <span class="col1-text">${data[lang].vat}</span>
                        </p>
                    <p class="col col2">${vat?.toLocaleString()}</p>
                    <div class="clear"></div>
                </div>
                <div class="row">
                    <p class="col col1 colored">
                        <span class="border_yellow"></span>
                        <span class="col1-text">${data[lang].eco_tax}</span>
                    </p>
                    <p class="col col2">${environmental?.toLocaleString()}</p>
                    <div class="clear"></div>
                </div>
                <div class="row">
                    <p class="col col1 colored">
                        <span class="border_yellow"></span>
                        <span class="col1-text">${data[lang].broker_fee}</span>
                    </p>
                    <p class="col col2">75</p>
                    <div class="clear"></div>
                </div>
            </div>
            <div class="info">
                <span>${data[lang].total}</span>
                <span>${total_price1?.toLocaleString()} Դ</span>
                <span>${total_price2?.toLocaleString()} $</span>
            </div>
            <div class="info_3">
                <div style="border-left: 5px solid #eb1921">${
                data[lang].col_1
            }</div>
                <div style="border-left: 5px solid #F8991D">${
                data[lang].col_2
            }</div>
                <div style="border-left: 5px solid #FFDB2D">${
                data[lang].col_3
            }</div>
            </div>
        </div>
    </body>
</html>
`;
            pdf.create(template2, {
                height: "800px",
                width: "800px",
            }).toFile(
                path.resolve(__dirname, "../attachments", "calculation3.pdf"),
                (err) => {
                    if (err) {
                        return res.status(500).json(err.message);
                    }
                    return res.sendFile(
                        path.resolve(__dirname, "../attachments", "calculation3.pdf")
                    );
                }
            );
        } catch (err) {
            console.log(err.message);
            next(err);
        }
    }
}

module.exports = new CalculationController();

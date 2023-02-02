// const pool = require("../db");
// const axios = require("axios");
// const pdf = require("html-pdf");
// const { validationResult } = require("express-validator");
// const data = require("../data");
// const path = require("path");
// const puppeteer = require('puppeteer');
//
// class CalculationController {
//     async calculate(req, res, next) {
//         try {
//             const errors = validationResult(req);
//             if (!errors.isEmpty()) {
//                 let textMsg = "";
//                 errors.array().forEach((item) => (textMsg += `${item.msg}, `));
//                 textMsg = textMsg.slice(0, -2);
//                 return res.status(400).json(textMsg);
//             }
//             let {
//                 checkbox,
//                 auto_type,
//                 engine_volume,
//                 motor,
//                 auction_location,
//                 auction_location_id,
//                 price,
//                 auction,
//                 auction_fee = null,
//                 year,
//             } = req.body;
//
//             let currency = await axios.get(
//                 "https://online.evocabank.am/InternetBank/api/exchangerates/2"
//             );
//             currency = currency.data;
//
//             let auction_location_price =
//                 motor == 3 || motor == 4
//                     ? auction_location + 150
//                     : auction_location;
//
//             let auction_price = 0;
//
//             if (auction == "iaai") {
//                 const query = `SELECT * FROM internet_bid_fee_iaai WHERE internet_bid_fee_iaai.from <= ${price} AND internet_bid_fee_iaai.to >= ${price}`;
//                 let auction_price_1 = await pool.query(query);
//
//                 auction_price_1 = auction_price_1[0][0].auction_price;
//
//                 let auction_price_2;
//                 if (price < 15000) {
//                     const request = `SELECT * FROM buyer_fee_iaai WHERE buyer_fee_iaai.from <= ${price} AND buyer_fee_iaai.to >= ${price}`;
//                     auction_price_2 = await pool.query(request);
//                     auction_price_2 = auction_price_2?.[0]?.[0]?.auction_price;
//                 } else {
//                     auction_price_2 = price * 0.06;
//                 }
//
//                 auction_price = auction_price_1 + auction_price_2 + 124;
//             } else if (auction == "copart") {
//                 let copart_price_1 = await pool.query(
//                     `SELECT * FROM internet_bid_fee WHERE internet_bid_fee.from <= ${price} AND internet_bid_fee.to >= ${price}`
//                 );
//                 copart_price_1 = copart_price_1[0]
//                     ? copart_price_1[0][0].auction_price
//                     : 0;
//
//                 let copart_price_2;
//
//                 if (price < 15000) {
//                     copart_price_2 = await pool.query(
//                         `SELECT * FROM buyer_fee WHERE buyer_fee.from <= ${price} AND buyer_fee.to >= ${price}`
//                     );
//                     copart_price_2 = copart_price_2[0]
//                         ? copart_price_2[0][0].auction_price
//                         : 0;
//                 } else {
//                     copart_price_2 = price * 0.0575;
//                 }
//
//                 auction_price = copart_price_1 + copart_price_2 + 89;
//             } else if (auction == "etc") {
//                 auction_price = auction_fee;
//             }
//
//             const insurance_price = Math.round(
//                 (price + auction_price + auction_location_price) * 0.01
//             );
//             let total;
//             if (auto_type == "motorcycle") {
//                 total = price + auction_price;
//             } else {
//                 total =
//                     price +
//                     auction_price +
//                     auction_location_price +
//                     insurance_price;
//             }
//             let dram;
//             dram = currency[1]["CBRate"] / currency[0]["Sale"];
//
//             let customs_clearance = 0;
//             let vat = 0;
//             let total_price1 = 0;
//             let total_price2 = 0;
//             let environmental = 0;
//             let param;
//
//             if (motor == 4) {
//                 checkbox = 0;
//                 param = await pool.query(
//                     `SELECT * FROM param WHERE param.motor_id = ${motor} AND param.ice_power = 0`
//                 );
//                 param = param[0][0];
//             } else if (checkbox == 1 && year == 1 && auto_type == "suv") {
//                 param = await pool.query(
//                     `SELECT * FROM param WHERE
//                             param.year_id = ${year} AND
//                             param.vehicle_type = "${auto_type}" AND
//                             param.motor_from <= ${engine_volume} AND
//                             param.motor_to >= ${engine_volume} AND
//                             param.ice_power >= 3`
//                 );
//                 param = param[0][0];
//             } else {
//                 checkbox = 0;
//                 const request = `SELECT * FROM param WHERE
//                     param.year_id = ${year} AND
//                     param.vehicle_type = ${
//                         auto_type === "suv" ? "'sedan'" : `"${auto_type}"`
//                     }
//                       AND
//                     param.motor_id = ${motor == 3 ? 1 : motor} AND
//                     param.motor_from <= ${engine_volume} AND
//                     param.motor_to >= ${engine_volume} AND
//                     param.ice_power = ${motor == 5 ? 1 : 0}`;
//
//                 param = await pool.query(request);
//                 param = param[0][0];
//             }
//
//             let stavka;
//             if (motor == 4) {
//                 stavka = param.stavka * dram;
//             } else {
//                 stavka = param.stavka * dram * engine_volume;
//             }
//
//             let percent = (total * param.percent) / 100;
//             if (motor == 4) {
//                 vat = 0;
//                 customs_clearance = 0; //($total) * 0.15;
//             } else if (motor == 3 && year == 1 && engine_volume >= 2800) {
//                 customs_clearance = Math.round(total * 0.15);
//                 vat = Math.round((customs_clearance + total) * 0.2);
//             } else {
//                 customs_clearance = Math.round(
//                     stavka >= percent ? stavka : percent
//                 );
//                 vat = Math.round((customs_clearance + total) * 0.2);
//             }
//
//             if (year == 3 || year == 4) {
//                 environmental = Math.round(total * 0.02);
//             } else if (year == 7) {
//                 environmental = Math.round(total * 0.1);
//             } else if (year == 6) {
//                 environmental = Math.round(total * 0.02);
//             }
//
//             let servicePrice;
//             if (price > 20000) {
//                 servicePrice = (price * 1.5) / 100;
//             } else {
//                 servicePrice = 300;
//             }
//
//             if (auto_type == "motorcycle") {
//                 Math.round(
//                     (total_price2 =
//                         price +
//                         auction_price +
//                         auction_location_price +
//                         vat +
//                         customs_clearance +
//                         insurance_price +
//                         environmental +
//                         75 +
//                         servicePrice)
//                 );
//                 total_price1 = Math.round(total_price2 * currency[0]["Sale"]);
//             } else {
//                 total_price2 = Math.round(
//                     total +
//                         vat +
//                         customs_clearance +
//                         environmental +
//                         75 +
//                         servicePrice
//                 );
//                 total_price1 = Math.round(total_price2 * currency[0]["Sale"]);
//             }
//
//             let motorM = await pool.query(
//                 `SELECT * FROM motor WHERE motor.id = ${motor}`
//             );
//             motorM = motorM[0][0];
//             let year_text = await pool.query(
//                 `SELECT * FROM year WHERE id = ${year}`
//             );
//             year_text = year_text?.[0]?.[0]?.name;
//             const response = {
//                 price,
//                 servicePrice,
//                 auction_location_price,
//                 auction_location_id,
//                 copart_price: auction_price,
//                 year,
//                 year_text: year_text || "",
//                 motor,
//                 auto_type,
//                 engine_volume,
//                 total,
//                 insurance_price,
//                 auction,
//                 customs_clearance,
//                 vat,
//                 environmental,
//                 total_price1,
//                 total_price2,
//                 checkbox,
//             };
//
//             return res.json(response);
//         } catch (err) {
//             console.log(err);
//             next(err);
//         }
//     }
//
//     async createAndDownloadPdf(req, res, next){
//         try{
//             const {
//                 lang,
//                 auction,
//                 copart_price,
//                 auction_location_place,
//                 auction_location_price,
//                 customs_clearance,
//                 engine_volume,
//                 environmental,
//                 insurance_price,
//                 motor_type,
//                 price,
//                 servicePrice,
//                 total_price1,
//                 total_price2,
//                 transport_type,
//                 vat,
//                 year,
//             } = req.body;
//             const auctionImg = auction === 'copart' ? 'https://autocomplex.am/static/media/coopart.2e5e27269181df279ff9.png' : auction === 'iaai' ? 'https://autocomplex.am/static/media/iaai.18e2f9b8d3a79923a8a7.svg' : '';
//             const browser = await puppeteer.launch({headless: false});
//             const page = await browser.newPage();
//             const content = `<!DOCTYPE html>
// <html lang="en">
//     <head>
//         <meta charset="UTF-8">
//         <meta name="viewport"
//               content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
//         <meta http-equiv="X-UA-Compatible" content="ie=edge">
//         <title>Document</title>
//         <style>
//             * {
//                 margin: 0;
//                 font-family: Arial, sans-serif;
//                 box-sizing: border-box;
//             }
//             .container{
//                 max-width: 800px;
//                 margin: 10px auto;
//             }
//             header{
//                 margin-bottom: 20px;
//             }
//             .content{
//                 background-color: #E6E7E8;
//             }
//             .address-item{
//                 width: 200px;
//                 float: left;
//                 font-size: 14px;
//                 font-weight: bold;
//                 margin-top: 52px;
//             }
//             .address-item p{
//                 text-align: center;
//             }
//             .clear{
//                 clear: both;
//             }
//             .img-container{
//                 margin: 0;
//             }
//             .img-container img{
//                 width: 200px;
//             }
//             .row{
//                 margin-bottom: 4px;
//             }
//             .col{
//                 border: 1px solid black;
//                 float: left;
//             }
//             .col{
//                 padding: 3px;
//             }
//             .col1{
//                 border-left: none;
//                 width: 396px;
//                 margin-right: 3px;
//             }
//             .col1{
//                 padding-left: 10px;
//             }
//             .col2{
//                 border-right: none;
//                 text-align: center;
//                 width: 399px;
//             }
//             .col2 img{
//                 height: 50px;
//             }
//             .content{
//                 margin-top: 20px;
//             }
//             .col1.colored{
//                 padding-left: 0;
//             }
//             .border_red{
//               background-color: #eb1921;
//             }
//             .border_yellow{
//               background-color: #FFDB2D;
//             }
//             .border_orange{
//               background-color: #F8991D;
//             }
//             .col1.colored{
//                 padding-left: 0;
//                 position: relative;
//             }
//             .col1-text{
//                 margin-left: 10px;
//             }
//             .border_red, .border_orange, .border_yellow{
//                 position: absolute;
//                 top: 0;
//                 bottom: 0;
//                 left: 0;
//                 width: 6px;
//             }
//             .info{
//                 margin-bottom: 20px;
//                 background-color: #E6E7E8;
//             }
//             .info span{
//                 display: inline-block;
//                 width: 268px;
//                 border: 1px solid;
//                 padding: 5px;
//                 font-weight: bold;
//                 font-size: 17px
//             }
//             .info span:first-child{
//                 border-left: 0;
//                 width: 255px;
//             }
//             .info span:last-child{
//                 border-right: 0;
//                 /*width: 266px;*/
//             }
//             .info_3{
//                 background-color: #E6E7E8;
//             }
//             .info_3 div:not(.clear) {
//                 display: inline-block;
//                 width: 266px;
//                 height: 85px;
//                 font-size: 14px;
//                 font-weight: bold;
//                 border: 1px solid;
//                 float: left;
//                 padding: 5px;
//             }
//         </style>
//     </head>
//     <body style="box-sizing: border-box">
//         <div class="container">
//             <header>
//                 <div class="img-container address-item">
//                     <img
//                         src="https://autocomplex.am/static/media/autocomplex.7e49d8d95bfae05bfc04.png"
//                         alt=""
//                     />
//                 </div>
//                 <div class="address-item address">
//                     <p>${data[lang].address1}</p>
//                     <p>autocomplex1@mail.ru</p>
//                     <p>+374 33 538080</p>
//                 </div>
//                 <div class="address-item address">
//                     <p>${data[lang].address2}</p>
//                     <p>autocomplex1@mail.ru</p>
//                     <p>+374 55 666555</p>
//                 </div>
//                 <div class="address-item address">
//                     <p>${data[lang].address3}</p>
//                     <p>autocomplex1@mail.ru</p>
//                     <p>+374 95 505054</p>
//                 </div>
//                 <div class="clear"></div>
//             </header>
//             <div class="content">
//                 <div class="row">
//                     <p class="col col1" style="padding-top: 21px; padding-bottom: 21px">${
//                 data[lang].auction
//             }</p>
//                     <div class="col col2" style="padding: ${
//                 auction === "copart" ? "11px 0" : "3.5px 0"
//             }">
//                         <img style="height: ${
//                 auction === "copart" ? "35px" : "50px"
//             };" src="${auctionImg}" alt="">
//                     </div>
//                     <div class="clear"></div>
//                 </div>
//                 <div class="row">
//                     <p class="col col1">${data[lang].selected_location}</p>
//                     <p class="col col2">${auction_location_place}</p>
//                     <div class="clear"></div>
//                 </div>
//                 <div class="row">
//                     <p class="col col1">${data[lang].age}</p>
//                     <p class="col col2">${data[lang].year[year]}</p>
//                     <div class="clear"></div>
//                 </div>
//                 <div class="row">
//                     <p class="col col1">${data[lang].fuel_type}</p>
//                     <p class="col col2">${data[lang].motor_type[motor_type]}</p>
//                     <div class="clear"></div>
//                 </div>
//                 <div class="row">
//                     <p class="col col1">${data[lang].engine}</p>
//                     <p class="col col2">${engine_volume}</p>
//                     <div class="clear"></div>
//                 </div>
//                 <div class="row">
//                     <p class="col col1">${data[lang].vehicle_type}</p>
//                     <p class="col col2">${
//                 data[lang].vehicle_types[transport_type]
//             }</p>
//                     <div class="clear"></div>
//                 </div>
//             </div>
//             <div class="content">
//                 <div class="row">
//                     <p class="col col1 colored">
//                         <span class="border_red"></span>
//                         <span class="col1-text">${data[lang].car_price}</span>
//                     </p>
//                     <p class="col col2">${price?.toLocaleString()}</p>
//                     <div class="clear"></div>
//                 </div>
//                 <div class="row">
//                     <p class="col col1 colored">
//                         <span class="border_red"></span>
//                         <span class="col1-text">${data[lang].auction_fee}</span>
//                     </p>
//                     <p class="col col2">${copart_price?.toLocaleString()}</p>
//                     <div class="clear"></div>
//                 </div>
//                 <div class="row">
//                     <p class="col col1 colored">
//                     <span class="border_orange"></span>
//                     <span class="col1-text">${data[lang].shipping_fee}</span>
//                     </p>
//                     <p class="col col2">${auction_location_price?.toLocaleString()}</p>
//                     <div class="clear"></div>
//                 </div>
//                 <div class="row">
//                     <p class="col col1 colored">
//                         <span class="border_orange"></span>
//                         <span class="col1-text">${data[lang].insurance}</span>
//                     </p>
//                     <p class="col col2">${insurance_price?.toLocaleString()}</p>
//                     <div class="clear"></div>
//                 </div>
//                 <div class="row">
//                     <p class="col col1 colored">
//                         <span class="border_orange"></span>
//                         <span class="col1-text">${
//                 data[lang].service_fee
//             }</span></p>
//                     <p class="col col2">${servicePrice?.toLocaleString()}</p>
//                     <div class="clear"></div>
//                 </div>
//                 <div class="row">
//                     <p class="col col1 colored">
//                         <span class="border_yellow"></span>
//                         <span class="col1-text">${
//                 data[lang].customs_duty
//             }</span></p>
//                     <p class="col col2">${customs_clearance?.toLocaleString()}</p>
//                     <div class="clear"></div>
//                 </div>
//                 <div class="row">
//                     <p class="col col1 colored">
//                         <span class="border_yellow"></span>
//                         <span class="col1-text">${data[lang].vat}</span>
//                         </p>
//                     <p class="col col2">${vat?.toLocaleString()}</p>
//                     <div class="clear"></div>
//                 </div>
//                 <div class="row">
//                     <p class="col col1 colored">
//                         <span class="border_yellow"></span>
//                         <span class="col1-text">${data[lang].eco_tax}</span>
//                     </p>
//                     <p class="col col2">${environmental?.toLocaleString()}</p>
//                     <div class="clear"></div>
//                 </div>
//                 <div class="row">
//                     <p class="col col1 colored">
//                         <span class="border_yellow"></span>
//                         <span class="col1-text">${data[lang].broker_fee}</span>
//                     </p>
//                     <p class="col col2">75</p>
//                     <div class="clear"></div>
//                 </div>
//             </div>
//             <div class="info">
//                 <span>${data[lang].total}</span>
//                 <span>${total_price1?.toLocaleString()} Դ</span>
//                 <span>${total_price2?.toLocaleString()} $</span>
//             </div>
//             <div class="info_3">
//                 <div style="border-left: 5px solid #eb1921">${
//                 data[lang].col_1
//             }</div>
//                 <div style="border-left: 5px solid #F8991D">${
//                 data[lang].col_2
//             }</div>
//                 <div style="border-left: 5px solid #FFDB2D">${
//                 data[lang].col_3
//             }</div>
//             </div>
//         </div>
//     </body>
// </html>`;
//
//             await page.setContent(content);
//             await page.emulateMediaType('screen');
//             await page.pdf({path: path.resolve(__dirname, "../attachments", "calculation3.pdf"), width: 900, height: 900, printBackground: true});
//
//             await browser.close();
//             return res.json('Created');
//         }catch(err){
//             next(err)
//         }
//     }
//
//     async fetchPdf(req, res, next){
//         try{
//             return res.sendFile(path.resolve(__dirname, "../attachments", 'calculation3.pdf'));
//         }catch(err){
//             next(err);
//         }
//     }
//
//     async createPdf1(req, res, next) {
//         try {
//             const {
//                 lang,
//                 auction,
//                 copart_price,
//                 auction_location_place,
//                 auction_location_price,
//                 customs_clearance,
//                 engine_volume,
//                 environmental,
//                 insurance_price,
//                 motor_type,
//                 price,
//                 servicePrice,
//                 total_price1,
//                 total_price2,
//                 transport_type,
//                 vat,
//                 year,
//             } = req.body;
//
//             const auctionImg =
//                 auction === "copart"
//                     ? "https://autocomplex.am/static/media/coopart.2e5e27269181df279ff9.png"
//                     : auction === "iaai"
//                         ? "https://autocomplex.am/static/media/iaai.18e2f9b8d3a79923a8a7.svg"
//                         : null;
//             const template2 = `<!DOCTYPE html>
// <html lang="ru">
//     <head>
//         <meta charset="UTF-8">
//         <meta name="viewport"
//               content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
//         <meta http-equiv="X-UA-Compatible" content="ie=edge">
//         <title>Document</title>
//         <style>
//             * {
//                 margin: 0;
//                 font-family: Arial, sans-serif;
//                 box-sizing: border-box;
//             }
//             .container{
//                 max-width: 800px;
//                 margin: 10px auto;
//             }
//             header{
//                 margin-bottom: 20px;
//             }
//             .content{
//                 background-color: #E6E7E8;
//             }
//             .address-item{
//                 width: 200px;
//                 float: left;
//                 font-size: 14px;
//                 font-weight: bold;
//                 margin-top: 52px;
//             }
//             .address-item p{
//                 text-align: center;
//             }
//             .clear{
//                 clear: both;
//             }
//             .img-container{
//                 margin: 0;
//             }
//             .img-container img{
//                 width: 200px;
//             }
//             .row{
//                 margin-bottom: 4px;
//             }
//             .col{
//                 border: 1px solid black;
//                 float: left;
//             }
//             .col{
//                 padding: 3px;
//             }
//             .col1{
//                 border-left: none;
//                 width: 396px;
//                 margin-right: 3px;
//             }
//             .col1{
//                 padding-left: 10px;
//             }
//             .col2{
//                 border-right: none;
//                 text-align: center;
//                 width: 399px;
//             }
//             .col2 img{
//                 height: 50px;
//             }
//             .content{
//                 margin-top: 20px;
//             }
//             .col1.colored{
//                 padding-left: 0;
//             }
//             .border_red{
//               background-color: #eb1921;
//             }
//             .border_yellow{
//               background-color: #FFDB2D;
//             }
//             .border_orange{
//               background-color: #F8991D;
//             }
//             .col1.colored{
//                 padding-left: 0;
//                 position: relative;
//             }
//             .col1-text{
//                 margin-left: 10px;
//             }
//             .border_red, .border_orange, .border_yellow{
//                 position: absolute;
//                 top: 0;
//                 bottom: 0;
//                 left: 0;
//                 width: 6px;
//             }
//             .info{
//                 margin-bottom: 20px;
//                 background-color: #E6E7E8;
//             }
//             .info span{
//                 display: inline-block;
//                 width: 263px;
//                 border: 1px solid;
//                 padding: 5px;
//                 font-weight: bold;
//                 font-size: 17px
//             }
//             .info span:first-child{
//                 border-left: 0;
//             }
//             .info span:last-child{
//                 border-right: 0;
//                 width: 266px;
//             }
//             .info_3{
//                 background-color: #E6E7E8;
//             }
//             .info_3 div:not(.clear) {
//                 display: inline-block;
//                 width: 266px;
//                 height: 85px;
//                 font-size: 14px;
//                 font-weight: bold;
//                 border: 1px solid;
//                 float: left;
//                 padding: 5px;
//             }
//         </style>
//     </head>
//     <body style="box-sizing: border-box">
//         <div class="container">
//             <header>
//                 <div class="img-container address-item">
//                     <img
//                         src="https://autocomplex.am/static/media/autocomplex.7e49d8d95bfae05bfc04.png"
//                         alt=""
//                     />
//                 </div>
//                 <div class="address-item address">
//                     <p>${data[lang].address1}</p>
//                     <p>autocomplex1@mail.ru</p>
//                     <p>+374 33 538080</p>
//                 </div>
//                 <div class="address-item address">
//                     <p>${data[lang].address2}</p>
//                     <p>autocomplex1@mail.ru</p>
//                     <p>+374 55 666555</p>
//                 </div>
//                 <div class="address-item address">
//                     <p>${data[lang].address3}</p>
//                     <p>autocomplex1@mail.ru</p>
//                     <p>+374 95 505054</p>
//                 </div>
//                 <div class="clear"></div>
//             </header>
//             <div class="content">
//                 <div class="row">
//                     <p class="col col1" style="padding-top: 21px; padding-bottom: 21px">${
//                 data[lang].auction
//             }</p>
//                     <div class="col col2" style="padding: ${
//                 auction === "copart" ? "11px 0" : "3.5px 0"
//             }">
//                         <img style="height: ${
//                 auction === "copart" ? "35px" : "50px"
//             };" src="${auctionImg}" alt="">
//                     </div>
//                     <div class="clear"></div>
//                 </div>
//                 <div class="row">
//                     <p class="col col1">${data[lang].selected_location}</p>
//                     <p class="col col2">${auction_location_place}</p>
//                     <div class="clear"></div>
//                 </div>
//                 <div class="row">
//                     <p class="col col1">${data[lang].age}</p>
//                     <p class="col col2">${data[lang].year[year]}</p>
//                     <div class="clear"></div>
//                 </div>
//                 <div class="row">
//                     <p class="col col1">${data[lang].fuel_type}</p>
//                     <p class="col col2">${data[lang].motor_type[motor_type]}</p>
//                     <div class="clear"></div>
//                 </div>
//                 <div class="row">
//                     <p class="col col1">${data[lang].engine}</p>
//                     <p class="col col2">${engine_volume}</p>
//                     <div class="clear"></div>
//                 </div>
//                 <div class="row">
//                     <p class="col col1">${data[lang].vehicle_type}</p>
//                     <p class="col col2">${
//                 data[lang].vehicle_types[transport_type]
//             }</p>
//                     <div class="clear"></div>
//                 </div>
//             </div>
//             <div class="content">
//                 <div class="row">
//                     <p class="col col1 colored">
//                         <span class="border_red"></span>
//                         <span class="col1-text">${data[lang].car_price}</span>
//                     </p>
//                     <p class="col col2">${price?.toLocaleString()}</p>
//                     <div class="clear"></div>
//                 </div>
//                 <div class="row">
//                     <p class="col col1 colored">
//                         <span class="border_red"></span>
//                         <span class="col1-text">${data[lang].auction_fee}</span>
//                     </p>
//                     <p class="col col2">${copart_price?.toLocaleString()}</p>
//                     <div class="clear"></div>
//                 </div>
//                 <div class="row">
//                     <p class="col col1 colored">
//                     <span class="border_orange"></span>
//                     <span class="col1-text">${data[lang].shipping_fee}</span>
//                     </p>
//                     <p class="col col2">${auction_location_price?.toLocaleString()}</p>
//                     <div class="clear"></div>
//                 </div>
//                 <div class="row">
//                     <p class="col col1 colored">
//                         <span class="border_orange"></span>
//                         <span class="col1-text">${data[lang].insurance}</span>
//                     </p>
//                     <p class="col col2">${insurance_price?.toLocaleString()}</p>
//                     <div class="clear"></div>
//                 </div>
//                 <div class="row">
//                     <p class="col col1 colored">
//                         <span class="border_orange"></span>
//                         <span class="col1-text">${
//                 data[lang].service_fee
//             }</span></p>
//                     <p class="col col2">${servicePrice?.toLocaleString()}</p>
//                     <div class="clear"></div>
//                 </div>
//                 <div class="row">
//                     <p class="col col1 colored">
//                         <span class="border_yellow"></span>
//                         <span class="col1-text">${
//                 data[lang].customs_duty
//             }</span></p>
//                     <p class="col col2">${customs_clearance?.toLocaleString()}</p>
//                     <div class="clear"></div>
//                 </div>
//                 <div class="row">
//                     <p class="col col1 colored">
//                         <span class="border_yellow"></span>
//                         <span class="col1-text">${data[lang].vat}</span>
//                         </p>
//                     <p class="col col2">${vat?.toLocaleString()}</p>
//                     <div class="clear"></div>
//                 </div>
//                 <div class="row">
//                     <p class="col col1 colored">
//                         <span class="border_yellow"></span>
//                         <span class="col1-text">${data[lang].eco_tax}</span>
//                     </p>
//                     <p class="col col2">${environmental?.toLocaleString()}</p>
//                     <div class="clear"></div>
//                 </div>
//                 <div class="row">
//                     <p class="col col1 colored">
//                         <span class="border_yellow"></span>
//                         <span class="col1-text">${data[lang].broker_fee}</span>
//                     </p>
//                     <p class="col col2">75</p>
//                     <div class="clear"></div>
//                 </div>
//             </div>
//             <div class="info">
//                 <span>${data[lang].total}</span>
//                 <span>${total_price1?.toLocaleString()} Դ</span>
//                 <span>${total_price2?.toLocaleString()} $</span>
//             </div>
//             <div class="info_3">
//                 <div style="border-left: 5px solid #eb1921">${
//                 data[lang].col_1
//             }</div>
//                 <div style="border-left: 5px solid #F8991D">${
//                 data[lang].col_2
//             }</div>
//                 <div style="border-left: 5px solid #FFDB2D">${
//                 data[lang].col_3
//             }</div>
//             </div>
//         </div>
//     </body>
// </html>
// `;
//             pdf.create(template2, {
//                 height: "800px",
//                 width: "800px",
//             }).toFile(
//                 path.resolve(__dirname, "../attachments", "calculation3.pdf"),
//                 (err) => {
//                     if (err) {
//                         return res.status(500).json(err.message);
//                     }
//                     return res.sendFile(
//                         path.resolve(__dirname, "../attachments", "calculation3.pdf")
//                     );
//                 }
//             );
//         } catch (err) {
//             console.log(err.message);
//             next(err);
//         }
//     }
// }
//
// module.exports = new CalculationController();


const pool = require("../db");
const axios = require("axios");
const pdf = require("html-pdf");
const { validationResult } = require("express-validator");
const data = require("../data");
const path = require("path");
const puppeteer = require('puppeteer');
const { v4:uuidv4 } = require('uuid');


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
                max-width: 820px;
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
                <span>${total_price1?.toLocaleString()} &#1423;</span>
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

            const template2 = `<!DOCTYPE html>
<html lang="am">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport"
              content="width=device-width, user-scalable=no, initial-scale=0.7, maximum-scale=1.0, minimum-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
        <title>Calculation</title>
        <style>
            * {
                margin: 0;
                font-family: Arial, sans-serif;
                box-sizing: border-box;
            }
            body{
                width 100%;
                min-width: 850px;
                /*padding: 10px;*/
            }
            .container{
                width 100%;
                min-width: 805px;
                margin: 10px auto;
            }
            header{
                margin-bottom: 20px;
            }
            /*.content{*/
            /*    background-color: #E6E7E8;*/
            /*}*/
            .address-item{
                min-width: 200px;
                width: 25%;
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
                /*width: 396px;*/
                /*min-width: 396px;*/
                /*width: 49.5%;*/
                width: 200px;
                margin-right: 3px;
            }
            .col1{
                padding-left: 10px;
            }
            .col2{
                border-right: none;
                text-align: center;
                /*width: 406px;*/
                /*min-width: 406px;*/
                /*width: 50%;*/
                width: 200px;
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
                min-width: 263px;
                width: 33%;
                border: 1px solid;
                padding: 5px;
                font-weight: bold;
                font-size: 17px
            }
            .info span img{
                height: 13px;
            }
            .info span:first-child{
                border-left: 0;
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
                min-width: 266px;
                width: 33%;
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
                    <img src="${data.imgs.autocomplex}" alt="">
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
                <span>${total_price1?.toLocaleString()} <img src="data:image/png;base64,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" /></span>
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
            const fileName = uuidv4();
            pdf.create(template2, {
                // height: "800px",
                // width: "850px",
                orientation: 'portrait',
                format: 'letter'
            }).toFile(
                path.resolve(__dirname, "..", "public/pdf", `${fileName}.pdf`),
                (err) => {
                    if (err) {
                        return res.status(500).json(err.message);
                    }
                    return res.json(fileName);
                }
            );
        } catch (err) {
            console.log(err.message);
            next(err);
        }
    }
}

module.exports = new CalculationController();

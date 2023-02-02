const router = require("express").Router();
const { homeView } = require("../controllers/HomeController");

router.get("/", homeView);

module.exports = router;

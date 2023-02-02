const router = require("express").Router();
const MailController = require("../controllers/MailController");
const CalculationController = require("../controllers/CalculationController");
const { check } = require("express-validator");
const TrialController = require('../controllers/TrialController');

const validationRules = [
    check("checkbox")
        .isIn([0, 1])
        .withMessage("Invalid off-road value specified"),
    check("motor")
        .isIn([1, 2, 3, 4])
        .withMessage("Invalid motor value specified"),
    check("year")
        .isIn([1, 2, 3, 4, 5, 6, 7])
        .withMessage("Invalid year value specified"),
    check("auction")
        .isIn(["iaai", "copart", "etc"])
        .withMessage("Invalid auction value specified"),
    check("engine_volume")
        .isNumeric()
        .withMessage("Invalid engine volume value specified"),
    check("auction_fee")
        .optional()
        .isNumeric()
        .withMessage("Invalid auction fee value specified"),
    check("price").isNumeric().withMessage("Invalid price value specified"),
    check("auto_type")
        .isIn(["motorcycle", "sedan", "pickup", "suv"])
        .withMessage("Invalid auto type value specified"),
];

router.post("/mail", MailController.sendMail);
router.post("/calculate", validationRules, CalculationController.calculate);
// router.post("/create-pdf", CalculationController.createAndDownloadPdf);
router.post("/create-pdf", CalculationController.createPdf1);
router.get("/fetch-pdf", CalculationController.fetchPdf);

module.exports = router;

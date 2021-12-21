require("dotenv").config();
const puppeteer = require("puppeteer");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

const EMAIL_ID = process.env.EMAIL_ID;
const PASSWORD = process.env.PASSWORD;
const ORDERS_LINK = process.env.ORDERS_LINK;

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(ORDERS_LINK, {
    waitUntil: "domcontentloaded",
  });

  await page.type("#ap_email", EMAIL_ID);

  await Promise.all([
    await page.click("#continue"),
    await page.waitForNavigation({ waitUntil: "domcontentloaded" }),
  ]);

  await page.type("#ap_password", PASSWORD);

  await Promise.all([
    await page.click("#signInSubmit"),
    await page.waitForNavigation({ waitUntil: "domcontentloaded" }),
  ]);

  let pagination = await page.waitForSelector(".a-pagination");
  const numberOfPages = await pagination.evaluate(
    (el) => el.childNodes[el.childNodes.length - 3].childNodes[0].textContent
  );
  const allDetails = [];
  for (let k = 0; k < numberOfPages; k++) {
    const elements = await page.$$(".a-box-group");
    for (let i = 0; i < elements.length; i++) {
      const date = await elements[i].evaluate(
        (el) =>
          el?.childNodes[3]?.childNodes[0]?.childNodes[1]?.childNodes[0]
            ?.childNodes[1]?.childNodes[1]?.childNodes[1]?.childNodes[3]
            ?.innerText
      );
      const price = await elements[i].evaluate(
        (el) =>
          el?.childNodes[3]?.childNodes[0]?.childNodes[1]?.childNodes[0]
            ?.childNodes[1]?.childNodes[1]?.childNodes[3]?.childNodes[3]
            ?.innerText
      );
      const name = await elements[i].evaluate(
        (el) =>
          el?.childNodes[3]?.childNodes[0]?.childNodes[1]?.childNodes[0]
            ?.childNodes[1]?.childNodes[1]?.childNodes[5]?.childNodes[3]
            ?.innerText
      );
      allDetails.push({
        date,
        price: parseFloat(price.replace(/,/g, "")),
        name,
        month: date.split(" ")[1],
      });
    }
    pagination = await page.waitForSelector(".a-pagination");
    const nextPageLink = await pagination.evaluate(
      (el) => el.childNodes[el.childNodes.length - 1].childNodes[0].href
    );
    if (k === numberOfPages - 1) break;
    await page.goto(nextPageLink, { waitUntil: "domcontentloaded" });
  }

  const csvWriter = createCsvWriter({
    path: "amazonorderhistory.csv",
    header: [
      { id: "date", title: "Date" },
      { id: "price", title: "Price" },
      { id: "name", title: "Name" },
      { id: "month", title: "Month" },
    ],
  });
  csvWriter.writeRecords(allDetails).then(async () => await browser.close());
})();

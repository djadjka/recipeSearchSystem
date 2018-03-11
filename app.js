var client = new elasticsearch.Client({
    host: 'localhost:9200',
    log: 'trace'
  });


let crawlerCallback = async function (browser) {
    try {
        await (browser.waitForVisible('.ingridients', 1500))
    } catch (err){
        return false;
    }
    let source = await browser.getSource('body')
    const $ = cheerio.load(source);
    const result = {
        ingridients: [],
        steps: []
    };
    $('.ingredient').each(function (i, element) {
        result.ingridients.push($(this).text().trim());
    });
    $('.instruction p').each(function (i, element) {
        result.steps.push($(this).text().trim());
    });
    return result;
}

let crawler = new Crawler('www.gastronom.ru', crawlerCallback);
crawler.start();
/**
 * doGet function
 * @returns 
 */
function doGet() {
    //return ContentService.createTextOutput("Hello, world!");
    return HtmlService.createTemplateFromFile('index').evaluate();
}


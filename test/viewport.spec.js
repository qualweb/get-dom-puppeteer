const { getDom } = require('../dist/index');
const { expect } = require('chai');
const stew = new(require('stew-select')).Stew();

const URL = 'http://accessible-serv.lasige.di.fc.ul.pt/~jvicente/test/';

describe('Viewport test', function() {
  it.only('Should have the viewport attributes', async function() {
    this.timeout(10 * 1000);
    const dom = await getDom(URL);

    const body = stew.select_first(dom.processed.html.parsed, 'body');
    expect(Object.keys(body.attribs)).to.be.an('array').and.to.include('window-inner-height');
  });
});
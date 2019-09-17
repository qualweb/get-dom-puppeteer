const { getDom } = require('../dist/index');
const stew = new(require('stew-select')).Stew();
const { expect } = require('chai');

const URL = 'http://accessible-serv.lasige.di.fc.ul.pt/~jvicente/test/';

describe('Testing CSS', function() {
  it('should have css', async function() {
    this.timeout(10 * 1000);
    const { stylesheets } = await getDom(URL);
    expect(stylesheets).to.not.be.undefined;
  });

  it('pseudo selector :before', async function() {
    this.timeout(10 * 1000);
    const { processed } = await getDom(URL);
    const img = stew.select_first(processed.html.parsed, 'img');

    expect(img.attribs['computed-style-before']).to.be.not.equal(undefined);
  });

  it.only('pseudo selector :after', async function() {
    this.timeout(10 * 1000);
    const { processed } = await getDom(URL);
    const img = stew.select_first(processed.html.parsed, 'img');
    
    expect(img.attribs['computed-style-after']).to.be.not.equal(undefined);
  });
});
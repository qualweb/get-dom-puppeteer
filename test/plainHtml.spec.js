const { getDom } = require('../dist/index');
const { expect } = require('chai');

const URL = 'https://ciencias.ulisboa.pt';

describe('Testing plain html', function() {
  it.only('should run', async function() {
    this.timeout(10 * 1000);
    const { processed } = await getDom(URL);
    console.warn(processed.html.plain);
    expect(processed).to.not.be.undefined;
  });
});
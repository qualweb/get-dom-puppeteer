const { getDom } = require('../dist/index');
const { expect } = require('chai');

const URL = 'https://ciencias.ulisboa.pt';

describe('Testing Map', function() {
  it('should run', async function() {
    this.timeout(10 * 1000);
    const { processed } = await getDom(URL);
    console.warn(processed.html.parsed[0]['attribs']['css']);
    expect(processed).to.not.be.undefined;
  });
});